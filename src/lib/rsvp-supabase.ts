/**
 * Server-side Supabase sync for RSVP submissions.
 *
 * Writes to rsvp_responses only (no Supabase guests table):
 *   invite_code, first_name, last_name, attending, total_attending,
 *   guest_names / guest_names_jsonb (all attending names), message, submitted_at
 *
 * Uses the service-role client (server-only). Never import from client scripts.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { allAttendingGuestNames } from './guest-names';
import { createAdminSupabase } from './supabase';
import type { RsvpSource, SavedRsvp } from './rsvp-store';
import { normalizeInviteCode as normalizeSlug } from './invite-opens';

export type SupabaseSyncResult = { ok: true } | { ok: false; error: string };

function syntheticInviteCode(name: string): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug ? `name-${slug}` : 'name-unknown';
}

async function insertRsvpResponse(
	client: SupabaseClient,
	rsvp: SavedRsvp,
	opts: {
		inviteCode: string;
		totalAttending: number;
		allGuestNames: string[];
		rsvpSource: RsvpSource;
	}
): Promise<SupabaseSyncResult> {
	const firstName = rsvp.firstName.trim();
	const lastName = rsvp.lastName.trim();
	const guestNamesText = opts.allGuestNames.join(', ');
	const submittedAt = rsvp.submittedAt;

	console.log('[rsvp-supabase] Inserting rsvp_response:', {
		invite_code: opts.inviteCode,
		attending: rsvp.attending,
		guest_names: opts.allGuestNames,
		total_attending: opts.totalAttending,
		message: rsvp.message || null,
	});

	const attempts: Record<string, unknown>[] = [
		{
			invite_code: opts.inviteCode,
			first_name: firstName || null,
			last_name: lastName || null,
			attending: rsvp.attending,
			total_attending: opts.totalAttending,
			guest_names_jsonb: opts.allGuestNames,
			guest_names: guestNamesText || null,
			message: rsvp.message || null,
			submitted_at: submittedAt,
			rsvp_source: opts.rsvpSource,
		},
		{
			invite_code: opts.inviteCode,
			first_name: firstName || null,
			last_name: lastName || null,
			attending: rsvp.attending,
			total_attending: opts.totalAttending,
			guest_names: opts.allGuestNames,
			message: rsvp.message || null,
			submitted_at: submittedAt,
		},
		{
			invite_code: opts.inviteCode,
			first_name: firstName || null,
			last_name: lastName || null,
			attending: rsvp.attending,
			total_attending: opts.totalAttending,
			guest_names: guestNamesText || null,
			message: rsvp.message || null,
			submitted_at: submittedAt,
		},
		{
			invite_code: opts.inviteCode,
			guest_name: rsvp.name,
			attending: rsvp.attending,
			guest_count: opts.totalAttending,
			guest_names: guestNamesText || null,
			message: rsvp.message || null,
			submitted_at: submittedAt,
		},
	];

	for (const row of attempts) {
		const { error } = await client.from('rsvp_responses').insert(row);
		if (!error) {
			console.log('[rsvp-supabase] insert success for invite_code:', opts.inviteCode);
			return { ok: true };
		}

		const missingColumn = error.message.includes('Could not find the');
		if (missingColumn) {
			console.warn('[rsvp-supabase] Insert shape rejected:', error.message, '— trying fallback.');
			continue;
		}

		console.error(
			'[rsvp-supabase] Failed to insert rsvp_responses:',
			error.message,
			error.details ?? '',
			error.hint ?? ''
		);
		return { ok: false, error: error.message };
	}

	return {
		ok: false,
		error:
			'Could not save RSVP to Supabase: rsvp_responses is missing required columns. Run supabase/migrations/fix_rsvp_responses_columns.sql and add_rsvp_guest_names_jsonb.sql in the Supabase SQL Editor.',
	};
}

export async function deleteRsvpFromSupabase(
	inviteCode: string
): Promise<SupabaseSyncResult> {
	const client = createAdminSupabase();
	if (!client) {
		return { ok: false, error: 'RSVP sync is not configured on the server' };
	}

	const code = normalizeSlug(inviteCode);
	const { error } = await client.from('rsvp_responses').delete().eq('invite_code', code);
	if (error) {
		console.error('[rsvp-supabase] delete failed:', code, error.message);
		return { ok: false, error: error.message };
	}
	return { ok: true };
}

export async function clearAllRsvpsFromSupabase(): Promise<SupabaseSyncResult> {
	const client = createAdminSupabase();
	if (!client) {
		return { ok: false, error: 'RSVP sync is not configured on the server' };
	}

	const { error } = await client.from('rsvp_responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
	if (error) {
		console.error('[rsvp-supabase] clear all failed:', error.message);
		return { ok: false, error: error.message };
	}
	return { ok: true };
}

export async function syncRsvpToSupabase(
	rsvp: SavedRsvp,
	inviteCode?: string | null,
	rsvpSource: RsvpSource = rsvp.rsvpSource ?? 'guest'
): Promise<SupabaseSyncResult> {
	const client = createAdminSupabase();
	if (!client) {
		console.error('[rsvp-supabase] SUPABASE_SERVICE_ROLE_KEY missing — cannot save RSVP');
		return { ok: false, error: 'RSVP sync is not configured on the server' };
	}

	const normalizedFromForm = normalizeSlug(inviteCode ?? '');
	const code = normalizedFromForm || syntheticInviteCode(rsvp.name);
	const allGuestNames = rsvp.attending ? allAttendingGuestNames(rsvp.guestNames) : [];
	const totalAttending = rsvp.attending ? allGuestNames.length : 0;

	console.log('[rsvp-supabase] sync start:', {
		invite_code: code,
		attending: rsvp.attending,
		guest_names: allGuestNames,
		total_attending: totalAttending,
		message: rsvp.message || null,
	});

	return insertRsvpResponse(client, rsvp, {
		inviteCode: code,
		totalAttending,
		allGuestNames,
		rsvpSource,
	});
}

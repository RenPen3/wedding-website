/**
 * Server-side Supabase sync for RSVP submissions.
 *
 * Writes to rsvp_responses:
 *   guest_id, invite_code, first_name, last_name, attending, total_attending,
 *   guest_names (additional guests only), message, submitted_at
 *
 * Uses the service-role client when available (server-only). Never import from client scripts.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabase, createPublicSupabase } from './supabase';
import type { SavedRsvp } from './rsvp-store';

export type SupabaseSyncResult = { ok: true } | { ok: false; error: string };

type GuestRow = Record<string, unknown> & {
	id: string;
	invite_code?: string | null;
	guest_name?: string | null;
	first_name?: string | null;
	last_name?: string | null;
};

function getServerSupabase(): { client: SupabaseClient; isAdmin: boolean } {
	const admin = createAdminSupabase();
	if (admin) return { client: admin, isAdmin: true };
	return { client: createPublicSupabase(), isAdmin: false };
}

function normalizeInviteCode(raw: string | null | undefined): string {
	return (raw ?? '').trim().toLowerCase();
}

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function syntheticInviteCode(name: string): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug ? `name-${slug}` : 'name-unknown';
}

function guestNamesText(names: string[]): string {
	return names.map((n) => n.trim()).filter(Boolean).join(', ');
}

/** Additional guest names only — guest 1 in the form is the main invitee. */
function additionalGuestNames(allNames: string[]): string[] {
	return allNames.slice(1).map((n) => n.trim()).filter(Boolean);
}

/** Main guest counts as 1; each non-blank additional name adds +1. */
function computeTotalAttending(attending: boolean, allGuestNames: string[]): number {
	if (!attending) return 0;
	return 1 + additionalGuestNames(allGuestNames).length;
}

function guestDisplayName(row: GuestRow): string {
	const fromGuestName = String(row.guest_name ?? '').trim();
	if (fromGuestName) return fromGuestName;
	return [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
}

function namesMatch(a: string, b: string): boolean {
	const na = a.trim().toLowerCase().replace(/\s+/g, ' ');
	const nb = b.trim().toLowerCase().replace(/\s+/g, ' ');
	if (!na || !nb) return false;
	return na === nb || na.includes(nb) || nb.includes(na);
}

async function findGuestByInviteCode(
	client: SupabaseClient,
	code: string
): Promise<GuestRow | null> {
	const { data, error } = await client
		.from('guests')
		.select('*')
		.eq('invite_code', code)
		.maybeSingle();

	if (error) {
		console.error('[rsvp-supabase] Guest lookup by invite_code failed:', error.message);
		return null;
	}
	return (data as GuestRow | null) ?? null;
}

async function findGuestByName(client: SupabaseClient, name: string): Promise<GuestRow | null> {
	const trimmed = name.trim();
	if (!trimmed) return null;

	const { data: rows, error: listError } = await client.from('guests').select('*');
	if (listError) {
		console.error('[rsvp-supabase] Guest list lookup failed:', listError.message);
		return null;
	}

	return (
		(rows as GuestRow[] | null)?.find((row) => namesMatch(guestDisplayName(row), trimmed)) ?? null
	);
}

async function tryRpcSubmit(
	client: SupabaseClient,
	code: string,
	rsvp: SavedRsvp,
	count: number,
	namesText: string
): Promise<SupabaseSyncResult | null> {
	const { error } = await client.rpc('submit_guest_rsvp', {
		p_invite_code: code,
		p_attending: rsvp.attending,
		p_guest_count: count,
		p_guest_names: namesText,
		p_message: rsvp.message,
	});

	if (!error) return { ok: true };

	// RPC missing or schema mismatch — fall back to direct insert/update.
	if (
		error.message.includes('Could not find the function') ||
		error.message.includes('schema cache')
	) {
		console.warn('[rsvp-supabase] submit_guest_rsvp RPC unavailable, using direct writes.');
		return null;
	}

	console.error('[rsvp-supabase] submit_guest_rsvp RPC failed:', error.message, error.details ?? '');
	return { ok: false, error: error.message };
}

async function updateGuestRow(
	client: SupabaseClient,
	guestId: string,
	rsvp: SavedRsvp,
	totalAttending: number,
	additionalNamesText: string
): Promise<SupabaseSyncResult> {
	const now = new Date().toISOString();
	const status = rsvp.attending ? 'yes' : 'no';

	// Admin-style columns (first_name / total_attending / guest_names / message / updated_at)
	const adminPayload = {
		rsvp_status: status,
		total_attending: totalAttending,
		guest_names: additionalNamesText || null,
		message: rsvp.message || null,
		updated_at: now,
	};

	let { error } = await client.from('guests').update(adminPayload).eq('id', guestId);

	// schema.sql columns (rsvp_guest_count / rsvp_guest_names / rsvp_message / rsvp_submitted_at)
	if (error?.message.includes('column')) {
		console.warn('[rsvp-supabase] Admin guest columns missing, trying schema.sql columns.');
		const schemaPayload = {
			rsvp_status: status,
			rsvp_guest_count: totalAttending,
			rsvp_guest_names: additionalNamesText || null,
			rsvp_message: rsvp.message || null,
			rsvp_submitted_at: now,
		};
		({ error } = await client.from('guests').update(schemaPayload).eq('id', guestId));
	}

	if (error) {
		console.error('[rsvp-supabase] Failed to update guests:', error.message, error.details ?? '');
		return {
			ok: false,
			error: `RSVP saved, but updating the guest record failed: ${error.message}`,
		};
	}

	return { ok: true };
}

async function insertRsvpResponse(
	client: SupabaseClient,
	rsvp: SavedRsvp,
	opts: {
		guestId?: string | null;
		inviteCode?: string | null;
		totalAttending: number;
		additionalNamesText: string;
	}
): Promise<SupabaseSyncResult> {
	const resolvedCode = opts.inviteCode?.trim() || syntheticInviteCode(rsvp.name);
	const firstName = rsvp.firstName.trim();
	const lastName = rsvp.lastName.trim();

	const baseFields = {
		invite_code: resolvedCode,
		first_name: firstName || null,
		last_name: lastName || null,
		attending: rsvp.attending,
		total_attending: opts.totalAttending,
		guest_names: opts.additionalNamesText || null,
		message: rsvp.message || null,
		submitted_at: rsvp.submittedAt,
	};

	console.log('[rsvp-supabase] Inserting rsvp_response:', {
		first_name: firstName,
		last_name: lastName,
		guest_names: opts.additionalNamesText || null,
		total_attending: opts.totalAttending,
	});

	const attempts: Record<string, unknown>[] = [];

	if (opts.guestId) {
		attempts.push({ guest_id: opts.guestId, ...baseFields });
	} else {
		attempts.push({ ...baseFields });
	}

	// Legacy shapes (guest_count / guest_name) for older schemas
	attempts.push({
		guest_id: opts.guestId ?? null,
		invite_code: resolvedCode,
		guest_name: rsvp.name,
		attending: rsvp.attending,
		guest_count: opts.totalAttending,
		guest_names: opts.additionalNamesText || null,
		message: rsvp.message || null,
		submitted_at: rsvp.submittedAt,
	});

	attempts.push({
		invite_code: resolvedCode,
		guest_name: rsvp.name,
		attending: rsvp.attending,
		guest_count: opts.totalAttending,
		guest_names: opts.additionalNamesText || null,
		message: rsvp.message || null,
		submitted_at: rsvp.submittedAt,
	});

	for (const row of attempts) {
		const { error } = await client.from('rsvp_responses').insert(row);
		if (!error) return { ok: true };

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
			'Could not save RSVP to Supabase: rsvp_responses is missing required columns. Run supabase/migrations/fix_rsvp_responses_columns.sql in the Supabase SQL Editor.',
	};
}

export async function syncRsvpToSupabase(
	rsvp: SavedRsvp,
	inviteCode?: string | null,
	guestId?: string | null
): Promise<SupabaseSyncResult> {
	const { client } = getServerSupabase();
	const totalAttending = computeTotalAttending(rsvp.attending, rsvp.guestNames);
	const additionalNamesText = guestNamesText(additionalGuestNames(rsvp.guestNames));
	const rpcCount = totalAttending;

	let code = normalizeInviteCode(inviteCode);
	let guest: GuestRow | null = null;

	if (guestId?.trim() && isUuid(guestId.trim())) {
		const { data, error } = await client.from('guests').select('*').eq('id', guestId.trim()).maybeSingle();
		if (error) {
			console.error('[rsvp-supabase] guestId lookup failed:', error.message);
		} else if (data) {
			guest = data as GuestRow;
			if (!code && guest.invite_code) {
				code = normalizeInviteCode(String(guest.invite_code));
			}
		}
	}

	if (!guest && code) {
		guest = await findGuestByInviteCode(client, code);
	} else if (!guest) {
		guest = await findGuestByName(client, rsvp.name);
		if (guest?.invite_code) {
			code = normalizeInviteCode(String(guest.invite_code));
		}
	}

	if (code) {
		const rpcResult = await tryRpcSubmit(client, code, rsvp, rpcCount, additionalNamesText);
		if (rpcResult) return rpcResult;
	}

	if (guest) {
		const guestUpdate = await updateGuestRow(client, guest.id, rsvp, totalAttending, additionalNamesText);
		if (!guestUpdate.ok) return guestUpdate;

		return insertRsvpResponse(client, rsvp, {
			guestId: guest.id,
			inviteCode: code || normalizeInviteCode(String(guest.invite_code ?? '')),
			totalAttending,
			additionalNamesText,
		});
	}

	// No guests row — still record the RSVP response by name.
	console.warn(
		`[rsvp-supabase] No guests row for "${rsvp.name}"${code ? ` / invite ${code}` : ''}; inserting name-only response.`
	);

	return insertRsvpResponse(client, rsvp, {
		guestId: null,
		inviteCode: code || null,
		totalAttending,
		additionalNamesText,
	});
}

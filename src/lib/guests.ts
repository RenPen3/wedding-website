import { createAdminSupabase, createPublicSupabase } from './supabase';

export type GuestRecord = {
	id: string;
	invite_code: string;
	guest_name: string;
	opened_at: string | null;
	last_opened_at: string | null;
	open_count: number;
	rsvp_status: 'yes' | 'no' | null;
	rsvp_guest_count: number | null;
	rsvp_guest_names: string | null;
	rsvp_message: string | null;
	rsvp_submitted_at: string | null;
};

export type AdminGuestRow = GuestRecord;

function normalizeInviteCode(raw: string): string {
	return decodeURIComponent(raw).trim().toLowerCase();
}

function parseGuestRow(data: unknown): GuestRecord | null {
	if (!data || typeof data !== 'object') return null;
	const row = data as Record<string, unknown>;
	if (typeof row.invite_code !== 'string' || typeof row.guest_name !== 'string') {
		return null;
	}
	return {
		id: String(row.id ?? ''),
		invite_code: row.invite_code,
		guest_name: row.guest_name,
		opened_at: (row.opened_at as string | null) ?? null,
		last_opened_at: (row.last_opened_at as string | null) ?? null,
		open_count: Number(row.open_count ?? 0),
		rsvp_status:
			row.rsvp_status === 'yes' || row.rsvp_status === 'no' ? row.rsvp_status : null,
		rsvp_guest_count:
			row.rsvp_guest_count === null || row.rsvp_guest_count === undefined
				? null
				: Number(row.rsvp_guest_count),
		rsvp_guest_names: (row.rsvp_guest_names as string | null) ?? null,
		rsvp_message: (row.rsvp_message as string | null) ?? null,
		rsvp_submitted_at: (row.rsvp_submitted_at as string | null) ?? null,
	};
}

/** Look up guest by invite code and record an open (server-side). */
export async function trackInvitationOpen(rawCode: string): Promise<GuestRecord | null> {
	const inviteCode = normalizeInviteCode(rawCode);
	if (!inviteCode) return null;

	const supabase = createPublicSupabase();
	const { data, error } = await supabase.rpc('track_invitation_open', {
		p_invite_code: inviteCode,
	});

	if (error) {
		console.error('[trackInvitationOpen]', error.message);
		return null;
	}

	return parseGuestRow(data);
}

export type SubmitRsvpPayload = {
	inviteCode: string;
	attending: boolean;
	guestCount: number;
	guestNames: string;
	message: string;
};

export async function submitGuestRsvp(
	payload: SubmitRsvpPayload
): Promise<{ ok: true; guest: GuestRecord } | { ok: false; error: string }> {
	const inviteCode = normalizeInviteCode(payload.inviteCode);
	if (!inviteCode) {
		return { ok: false, error: 'Missing invite code' };
	}

	const supabase = createPublicSupabase();
	const { data, error } = await supabase.rpc('submit_guest_rsvp', {
		p_invite_code: inviteCode,
		p_attending: payload.attending,
		p_guest_count: payload.guestCount,
		p_guest_names: payload.guestNames,
		p_message: payload.message,
	});

	if (error) {
		if (error.message.includes('INVITE_NOT_FOUND')) {
			return { ok: false, error: 'Invitation not found' };
		}
		console.error('[submitGuestRsvp]', error.message);
		return { ok: false, error: 'Could not save RSVP' };
	}

	const guest = parseGuestRow(data);
	if (!guest) {
		return { ok: false, error: 'Invalid response from server' };
	}

	return { ok: true, guest };
}

/** Admin: list all guests (requires service role key on server). */
export async function listGuestsForAdmin(): Promise<AdminGuestRow[]> {
	const supabase = createAdminSupabase();
	if (!supabase) {
		throw new Error(
			'Admin Supabase client unavailable. Set SUPABASE_SERVICE_ROLE_KEY on the server.'
		);
	}

	const { data, error } = await supabase
		.from('guests')
		.select(
			'id, invite_code, guest_name, opened_at, last_opened_at, open_count, rsvp_status, rsvp_guest_count, rsvp_guest_names, rsvp_message, rsvp_submitted_at'
		)
		.order('guest_name', { ascending: true });

	if (error) {
		throw new Error(error.message);
	}

	return (data ?? []) as AdminGuestRow[];
}

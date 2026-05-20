import { supabase } from './supabaseClient';

/** Guest shape used by invite pages and RSVP form. */
export type GuestRecord = {
	id: string;
	invite_code: string;
	guest_name: string;
	first_name?: string | null;
	last_name?: string | null;
	email?: string | null;
	phone?: string | null;
	opened_at?: string | null;
	last_opened_at?: string | null;
	open_count?: number | null;
	rsvp_status: string | null;
	rsvp_guest_count: number | null;
	rsvp_guest_names: string | null;
	rsvp_message: string | null;
	rsvp_submitted_at: string | null;
};

export type SubmitRsvpPayload = {
	inviteCode: string;
	attending: boolean;
	guestCount: number;
	guestNames: string;
	message: string;
};

function normalizeInviteCode(raw: string): string {
	return decodeURIComponent(raw).trim().toLowerCase();
}

function toGuestRecord(row: Record<string, unknown>): GuestRecord {
	const first = (row.first_name as string | null) ?? null;
	const last = (row.last_name as string | null) ?? null;
	const guest_name = [first, last].filter(Boolean).join(' ').trim() || String(row.invite_code ?? '');

	return {
		id: String(row.id ?? ''),
		invite_code: String(row.invite_code ?? ''),
		guest_name,
		first_name: first,
		last_name: last,
		email: (row.email as string | null) ?? null,
		phone: (row.phone as string | null) ?? null,
		opened_at: (row.opened_at as string | null) ?? null,
		last_opened_at: (row.last_opened_at as string | null) ?? null,
		open_count: row.open_count != null ? Number(row.open_count) : null,
		rsvp_status: (row.rsvp_status as string | null) ?? null,
		rsvp_guest_count:
			row.total_attending != null
				? Number(row.total_attending)
				: row.rsvp_guest_count != null
					? Number(row.rsvp_guest_count)
					: null,
		rsvp_guest_names: (row.guest_names as string | null) ?? (row.rsvp_guest_names as string | null) ?? null,
		rsvp_message: (row.message as string | null) ?? (row.rsvp_message as string | null) ?? null,
		rsvp_submitted_at:
			(row.rsvp_submitted_at as string | null) ??
			(row.rsvp_status ? ((row.updated_at as string | null) ?? null) : null),
	};
}

export async function trackInvitationOpen(inviteCode: string): Promise<GuestRecord | null> {
	const code = normalizeInviteCode(inviteCode);
	if (!code) return null;

	const { data: guest, error } = await supabase
		.from('guests')
		.select('*')
		.eq('invite_code', code)
		.single();

	if (error || !guest) {
		return null;
	}

	const { data: updatedGuest, error: updateError } = await supabase
		.from('guests')
		.update({
			opened_at: guest.opened_at ?? new Date().toISOString(),
			last_opened_at: new Date().toISOString(),
			open_count: (guest.open_count ?? 0) + 1,
			updated_at: new Date().toISOString(),
		})
		.eq('id', guest.id)
		.select('*')
		.single();

	if (updateError) {
		console.error('Error tracking invitation open:', updateError);
		return toGuestRecord(guest as Record<string, unknown>);
	}

	return toGuestRecord(updatedGuest as Record<string, unknown>);
}

export async function submitGuestRsvp(
	payload: SubmitRsvpPayload
): Promise<{ ok: true; guest: GuestRecord } | { ok: false; error: string }> {
	const code = normalizeInviteCode(payload.inviteCode);
	if (!code) {
		return { ok: false, error: 'Missing invite code' };
	}

	const { data: guest, error: findError } = await supabase
		.from('guests')
		.select('*')
		.eq('invite_code', code)
		.single();

	if (findError || !guest) {
		return { ok: false, error: 'Invitation not found' };
	}

	const now = new Date().toISOString();
	const rsvp_status = payload.attending ? 'yes' : 'no';
	const total_attending = payload.attending ? Math.max(1, payload.guestCount) : 0;

	const { data: updated, error: updateError } = await supabase
		.from('guests')
		.update({
			rsvp_status,
			total_attending,
			guest_names: payload.guestNames || null,
			message: payload.message || null,
			updated_at: now,
		})
		.eq('id', guest.id)
		.select('*')
		.single();

	if (updateError) {
		console.error('Error saving RSVP:', updateError);
		return { ok: false, error: 'Could not save RSVP' };
	}

	// Log response history when table exists (ignore if not migrated yet)
	await supabase.from('rsvp_responses').insert({
		guest_id: guest.id,
		invite_code: code,
		attending: payload.attending,
		guest_count: total_attending,
		guest_names: payload.guestNames || null,
		message: payload.message || null,
		submitted_at: now,
	});

	return { ok: true, guest: toGuestRecord(updated as Record<string, unknown>) };
}

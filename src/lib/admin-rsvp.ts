import { findGuestListEntryByInviteCode } from './guest-list';
import {
	buildGuestActivityReport,
	type GuestActivityRow,
	normalizeInviteCode,
} from './invite-opens';
import { deleteRsvpForGuest, saveRsvp } from './rsvp-store';
import { deleteRsvpFromSupabase, syncRsvpToSupabase } from './rsvp-supabase';

export type AdminRsvpStatus = 'pending' | 'attending' | 'declined';

export type AdminRsvpPayload = {
	invite_code: string;
	rsvpStatus: AdminRsvpStatus;
	totalGuests?: number;
	guestNames?: string[];
	message?: string;
};

function guestRowForCode(rows: GuestActivityRow[], inviteCode: string): GuestActivityRow | null {
	const code = normalizeInviteCode(inviteCode);
	return rows.find((row) => normalizeInviteCode(row.invite_code) === code) ?? null;
}

export async function saveAdminRsvp(
	payload: AdminRsvpPayload
): Promise<{ ok: true; guest: GuestActivityRow } | { ok: false; error: string }> {
	const inviteCode = normalizeInviteCode(payload.invite_code);
	if (!inviteCode) {
		return { ok: false, error: 'Invite code is required.' };
	}

	const entry = findGuestListEntryByInviteCode(inviteCode);
	if (!entry) {
		return { ok: false, error: 'Guest not found on the invitation list.' };
	}

	const message = String(payload.message ?? '').trim();
	const guestNames = (payload.guestNames ?? []).map((name) => String(name).trim());
	const totalGuests =
		typeof payload.totalGuests === 'number' && Number.isFinite(payload.totalGuests)
			? Math.floor(payload.totalGuests)
			: guestNames.length;

	if (payload.rsvpStatus === 'pending') {
		await deleteRsvpForGuest(entry.name);
		const deleted = await deleteRsvpFromSupabase(inviteCode);
		if (!deleted.ok) {
			return { ok: false, error: deleted.error };
		}

		const guests = await buildGuestActivityReport();
		const guest = guestRowForCode(guests, inviteCode);
		if (!guest) {
			return { ok: false, error: 'Could not load updated guest data.' };
		}
		return { ok: true, guest };
	}

	const attending = payload.rsvpStatus === 'attending';
	const guestCount = attending ? totalGuests : 0;
	const attendingNames = attending ? guestNames : [];

	if (attending) {
		if (!Number.isInteger(guestCount) || guestCount < 1) {
			return { ok: false, error: 'Party size must be at least 1 when attending.' };
		}
		if (guestCount > entry.maxGuests) {
			return {
				ok: false,
				error: `This invitation reserves up to ${entry.maxGuests} seat(s).`,
			};
		}
		if (attendingNames.length !== guestCount) {
			return { ok: false, error: 'Please provide a name for each guest.' };
		}
		if (attendingNames.some((name) => !name)) {
			return { ok: false, error: 'All guest names are required.' };
		}
	}

	const result = await saveRsvp(
		{
			name: entry.name,
			attending,
			guestCount,
			guestNames: attendingNames,
			message,
		},
		{
			guest: { name: entry.name, maxGuests: entry.maxGuests },
			source: 'manual',
		}
	);

	if (!result.ok) {
		return result;
	}

	const sync = await syncRsvpToSupabase(result.rsvp, inviteCode, 'manual');
	if (!sync.ok) {
		return { ok: false, error: sync.error };
	}

	const guests = await buildGuestActivityReport();
	const guest = guestRowForCode(guests, inviteCode);
	if (!guest) {
		return { ok: false, error: 'Could not load updated guest data.' };
	}

	return { ok: true, guest };
}

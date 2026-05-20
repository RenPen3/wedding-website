import { supabase } from './supabaseClient';

export type GuestRow = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	email: string | null;
	phone: string | null;
	invite_code: string;
	max_guests: number | null;
	invited_count: number | null;
	opened_at: string | null;
	last_opened_at: string | null;
	open_count: number | null;
	rsvp_status: string | null;
	total_attending: number | null;
	guest_names: string | null;
	message: string | null;
	created_at: string;
	updated_at: string | null;
};

export function guestDisplayName(guest: GuestRow): string {
	const name = [guest.first_name, guest.last_name].filter(Boolean).join(' ').trim();
	return name || guest.email || guest.invite_code;
}

export function normalizeRsvpStatus(status: string | null | undefined): 'pending' | 'attending' | 'declined' {
	if (!status) return 'pending';
	const s = status.toLowerCase();
	if (s === 'yes' || s === 'attending' || s === 'accepted') return 'attending';
	if (s === 'no' || s === 'declined' || s === 'not_attending' || s === 'not attending') {
		return 'declined';
	}
	if (s === 'pending') return 'pending';
	return 'pending';
}

export function hasOpened(guest: GuestRow): boolean {
	return (guest.open_count ?? 0) > 0 || Boolean(guest.opened_at);
}

export async function fetchAllGuests(): Promise<GuestRow[]> {
	const { data, error } = await supabase
		.from('guests')
		.select(
			'id, first_name, last_name, email, phone, invite_code, max_guests, invited_count, opened_at, last_opened_at, open_count, rsvp_status, total_attending, guest_names, message, created_at, updated_at'
		)
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error(error.message);
	}

	return (data ?? []) as GuestRow[];
}

export type GuestStats = {
	total: number;
	opened: number;
	notOpened: number;
	rsvpAttending: number;
	rsvpDeclined: number;
	rsvpPending: number;
	totalAttending: number;
};

export function computeGuestStats(guests: GuestRow[]): GuestStats {
	return guests.reduce(
		(acc, guest) => {
			acc.total += 1;
			if (hasOpened(guest)) acc.opened += 1;
			else acc.notOpened += 1;

			const rsvp = normalizeRsvpStatus(guest.rsvp_status);
			if (rsvp === 'attending') {
				acc.rsvpAttending += 1;
				acc.totalAttending += guest.total_attending ?? 0;
			} else if (rsvp === 'declined') {
				acc.rsvpDeclined += 1;
			} else {
				acc.rsvpPending += 1;
			}

			return acc;
		},
		{
			total: 0,
			opened: 0,
			notOpened: 0,
			rsvpAttending: 0,
			rsvpDeclined: 0,
			rsvpPending: 0,
			totalAttending: 0,
		}
	);
}

import type { APIRoute } from 'astro';
import { findInvitedGuest, getRsvpForGuest } from '../../lib/rsvp-store';

export const GET: APIRoute = async ({ url }) => {
	const name = url.searchParams.get('name') ?? '';
	if (!name.trim()) {
		return new Response(JSON.stringify({ ok: false, error: 'Name is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const guest = findInvitedGuest(name);
	if (!guest) {
		return new Response(JSON.stringify({ ok: false, error: 'Guest not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const existing = await getRsvpForGuest(guest.name);

	return new Response(
		JSON.stringify({
			ok: true,
			guest: {
				name: guest.name,
				maxGuests: guest.maxGuests,
			},
			rsvp: existing
				? {
						attending: existing.attending,
						guestCount: existing.guestCount,
						guestNames: existing.guestNames,
						message: existing.message,
						submittedAt: existing.submittedAt,
					}
				: null,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
};

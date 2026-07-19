import type { APIRoute } from 'astro';
import { getGuestById, getGuestByInviteCode } from '../../lib/guest-search';
import { findInvitedGuest, getRsvpForGuest } from '../../lib/rsvp-store';

export const GET: APIRoute = async ({ url }) => {
	const id = url.searchParams.get('id')?.trim();
	const inviteCode =
		url.searchParams.get('invite_code')?.trim() || url.searchParams.get('code')?.trim();
	const name = url.searchParams.get('name')?.trim();

	// Supabase guest selected from dropdown
	if (id) {
		try {
			const guest = await getGuestById(id);
			if (!guest) {
				return new Response(JSON.stringify({ ok: false, error: 'Guest not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			return new Response(
				JSON.stringify({
					ok: true,
					guest: {
						id: guest.id,
						first_name: guest.first_name,
						last_name: guest.last_name,
						name: guest.full_name,
						invite_code: guest.invite_code,
						maxGuests: guest.maxGuests,
					},
					rsvp: guest.rsvp,
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Lookup failed';
			console.error('[api/guest-lookup] id lookup failed:', message);
			return new Response(
				JSON.stringify({ ok: false, error: 'Could not search guest list. Please try again.' }),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
	}

	if (inviteCode) {
		try {
			const guest = await getGuestByInviteCode(inviteCode);
			if (!guest) {
				return new Response(JSON.stringify({ ok: false, error: 'Guest not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			return new Response(
				JSON.stringify({
					ok: true,
					guest: {
						id: guest.id,
						first_name: guest.first_name,
						last_name: guest.last_name,
						name: guest.full_name,
						invite_code: guest.invite_code,
						maxGuests: guest.maxGuests,
					},
					rsvp: guest.rsvp,
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Lookup failed';
			console.error('[api/guest-lookup] code lookup failed:', message);
			return new Response(
				JSON.stringify({ ok: false, error: 'Could not search guest list. Please try again.' }),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
	}

	// Legacy JSON guest-list lookup (open RSVP by typed name)
	if (!name) {
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

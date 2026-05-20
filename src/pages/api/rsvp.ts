import type { APIRoute } from 'astro';
<<<<<<< HEAD
import { findGuest, getState, upsertRsvp, validateGuestCount } from '../../lib/wedding-store';
=======
import { submitGuestRsvp } from '../../lib/guests';
>>>>>>> 7ed0930f2726406b0eaa5117afcb8e99203a0224

export const POST: APIRoute = async ({ request }) => {
	const contentType = request.headers.get('content-type') ?? '';
	let body: Record<string, unknown>;

	try {
		if (contentType.includes('application/json')) {
			body = (await request.json()) as Record<string, unknown>;
		} else {
			const form = await request.formData();
			body = Object.fromEntries(form.entries());
		}
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

<<<<<<< HEAD
	const slug = String(body.slug ?? '').trim().toLowerCase().replace(/\s+/g, '-');
	const displayName = String(body.displayName ?? '').trim();
	const attending = body.attending === true || body.attending === 'yes' || body.attending === 'true';
	const rawGuestCount = Number(body.guestCount);
	const dietary = String(body.dietary ?? '').trim();
=======
	const inviteCode = String(body.inviteCode ?? body.slug ?? '').trim();
	const attending =
		body.attending === true || body.attending === 'yes' || body.attending === 'true';
	const guestCount = Math.max(0, Math.min(20, Number(body.guestCount) || 0));
	const guestNames = String(body.guestNames ?? body.displayName ?? '').trim();
>>>>>>> 7ed0930f2726406b0eaa5117afcb8e99203a0224
	const message = String(body.message ?? '').trim();

	if (!inviteCode) {
		return new Response(JSON.stringify({ ok: false, error: 'Missing invite code' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

<<<<<<< HEAD
	const state = await getState();
	const guest = findGuest(state, slug);
	if (!guest) {
		return new Response(JSON.stringify({ ok: false, error: 'Unknown guest slug' }), {
			status: 404,
=======
	if (attending && !guestNames) {
		return new Response(JSON.stringify({ ok: false, error: 'Guest names are required' }), {
			status: 400,
>>>>>>> 7ed0930f2726406b0eaa5117afcb8e99203a0224
			headers: { 'Content-Type': 'application/json' },
		});
	}

<<<<<<< HEAD
	const guestCount = attending ? rawGuestCount : 1;
	const countError = validateGuestCount(guest, attending, guestCount);
	if (countError) {
		return new Response(JSON.stringify({ ok: false, error: countError }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await upsertRsvp({
		slug,
		displayName,
=======
	const result = await submitGuestRsvp({
		inviteCode,
>>>>>>> 7ed0930f2726406b0eaa5117afcb8e99203a0224
		attending,
		guestCount: attending ? Math.max(1, guestCount) : 0,
		guestNames,
		message,
	});

	if (!result.ok) {
		const status = result.error === 'Invitation not found' ? 404 : 500;
		return new Response(JSON.stringify({ ok: false, error: result.error }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(
		JSON.stringify({
			ok: true,
			guest: {
				invite_code: result.guest.invite_code,
				guest_name: result.guest.guest_name,
				rsvp_status: result.guest.rsvp_status,
				rsvp_submitted_at: result.guest.rsvp_submitted_at,
			},
		}),
		{
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		}
	);
};

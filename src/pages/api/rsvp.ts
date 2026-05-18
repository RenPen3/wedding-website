import type { APIRoute } from 'astro';
import { submitGuestRsvp } from '../../lib/guests';

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

	const inviteCode = String(body.inviteCode ?? body.slug ?? '').trim();
	const attending =
		body.attending === true || body.attending === 'yes' || body.attending === 'true';
	const guestCount = Math.max(0, Math.min(20, Number(body.guestCount) || 0));
	const guestNames = String(body.guestNames ?? body.displayName ?? '').trim();
	const message = String(body.message ?? '').trim();

	if (!inviteCode) {
		return new Response(JSON.stringify({ ok: false, error: 'Missing invite code' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (attending && !guestNames) {
		return new Response(JSON.stringify({ ok: false, error: 'Guest names are required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = await submitGuestRsvp({
		inviteCode,
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

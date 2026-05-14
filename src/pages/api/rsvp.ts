import type { APIRoute } from 'astro';
import { findGuest, getState, upsertRsvp } from '../../lib/wedding-store';

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

	const slug = String(body.slug ?? '').trim().toLowerCase().replace(/\s+/g, '-');
	const displayName = String(body.displayName ?? '').trim();
	const attending = body.attending === true || body.attending === 'yes' || body.attending === 'true';
	const guestCount = Math.max(1, Math.min(10, Number(body.guestCount) || 1));
	const dietary = String(body.dietary ?? '').trim();
	const message = String(body.message ?? '').trim();

	if (!slug || !displayName) {
		return new Response(JSON.stringify({ ok: false, error: 'Missing slug or name' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const state = await getState();
	if (!findGuest(state, slug)) {
		return new Response(JSON.stringify({ ok: false, error: 'Unknown guest slug' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await upsertRsvp({
		slug,
		displayName,
		attending,
		guestCount,
		dietary,
		message,
	});

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

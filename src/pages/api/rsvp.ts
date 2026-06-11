import type { APIRoute } from 'astro';
import { saveRsvp } from '../../lib/rsvp-store';
import { syncRsvpToSupabase } from '../../lib/rsvp-supabase';

export const POST: APIRoute = async ({ request }) => {
	let body: Record<string, unknown>;

	try {
		const contentType = request.headers.get('content-type') ?? '';
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

	const name = String(body.name ?? '').trim();
	const attending =
		body.attending === true || body.attending === 'yes' || body.attending === 'true';
	const guestCount = Number(body.guestCount ?? 1);
	const message = String(body.message ?? '').trim();
	const inviteCode = String(body.inviteCode ?? body.invite_code ?? '').trim() || null;

	let guestNames: string[] = [];
	if (Array.isArray(body.guestNames)) {
		guestNames = body.guestNames.map((n) => String(n).trim());
	} else if (typeof body.guestNames === 'string' && body.guestNames.trim()) {
		try {
			const parsed = JSON.parse(body.guestNames) as unknown;
			if (Array.isArray(parsed)) {
				guestNames = parsed.map((n) => String(n).trim());
			}
		} catch {
			guestNames = body.guestNames
				.split(',')
				.map((n) => n.trim())
				.filter(Boolean);
		}
	}

	if (!name) {
		return new Response(JSON.stringify({ ok: false, error: 'Guest name is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = await saveRsvp({
		name,
		attending,
		guestCount: attending ? guestCount : 0,
		guestNames,
		message,
	});

	if (!result.ok) {
		const status =
			result.error === 'Guest not found on the invitation list.' ? 404
			: result.error.startsWith('Guest count') || result.error.includes('guest name') ? 400
			: 500;
		return new Response(JSON.stringify({ ok: false, error: result.error }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Mirror the RSVP to Supabase (rsvp_responses + optional guests update by invite code).
	try {
		const sync = await syncRsvpToSupabase(result.rsvp, inviteCode);
		if (!sync.ok) {
			return new Response(JSON.stringify({ ok: false, error: sync.error }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'Unknown Supabase error';
		console.error('[api/rsvp] Supabase sync threw:', detail);
		return new Response(
			JSON.stringify({ ok: false, error: `Could not save RSVP to Supabase: ${detail}` }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}

	return new Response(
		JSON.stringify({
			ok: true,
			rsvp: result.rsvp,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
};

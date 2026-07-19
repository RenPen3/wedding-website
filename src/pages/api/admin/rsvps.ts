import type { APIRoute } from 'astro';
import { isValidAdminSession } from '../../../lib/admin-auth';
import { saveAdminRsvp, type AdminRsvpStatus } from '../../../lib/admin-rsvp';
import { clearAllRsvps, listRsvps } from '../../../lib/rsvp-store';
import { clearAllRsvpsFromSupabase } from '../../../lib/rsvp-supabase';

function getBearerToken(request: Request): string | undefined {
	const header = request.headers.get('authorization');
	if (!header?.startsWith('Bearer ')) return undefined;
	return header.slice(7).trim();
}

function unauthorized() {
	return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
		status: 401,
		headers: { 'Content-Type': 'application/json' },
	});
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

function parseGuestNames(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((name) => String(name).trim()).filter(Boolean);
}

function parseRsvpStatus(raw: unknown): AdminRsvpStatus | null {
	const value = String(raw ?? '').trim().toLowerCase();
	if (value === 'pending') return 'pending';
	if (value === 'rsvpd' || value === 'attending' || value === 'yes') return 'attending';
	if (
		value === 'declined' ||
		value === 'not_rsvpd' ||
		value === 'not-rsvpd' ||
		value === 'not_attending' ||
		value === 'not-attending' ||
		value === 'no'
	) {
		return 'declined';
	}
	return null;
}

export const GET: APIRoute = async ({ request }) => {
	if (!isValidAdminSession(getBearerToken(request))) return unauthorized();

	const rsvps = await listRsvps();
	return jsonResponse({ ok: true, rsvps, count: rsvps.length });
};

export const PUT: APIRoute = async ({ request }) => {
	if (!isValidAdminSession(getBearerToken(request))) return unauthorized();

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return jsonResponse({ ok: false, error: 'Invalid body' }, 400);
	}

	const inviteCode = String(body.invite_code ?? body.inviteCode ?? '').trim();
	const rsvpStatus = parseRsvpStatus(body.rsvpStatus ?? body.rsvp_status);
	if (!inviteCode) {
		return jsonResponse({ ok: false, error: 'Invite code is required.' }, 400);
	}
	if (!rsvpStatus) {
		return jsonResponse({ ok: false, error: 'Invalid RSVP status.' }, 400);
	}

	const totalGuestsRaw = body.totalGuests ?? body.total_guests ?? body.partySize;
	const totalGuests =
		totalGuestsRaw == null || totalGuestsRaw === '' ? undefined : Number(totalGuestsRaw);
	if (totalGuests != null && (!Number.isFinite(totalGuests) || totalGuests < 0)) {
		return jsonResponse({ ok: false, error: 'Party size must be a valid number.' }, 400);
	}

	const result = await saveAdminRsvp({
		invite_code: inviteCode,
		rsvpStatus,
		totalGuests,
		guestNames: parseGuestNames(body.guestNames ?? body.guest_names),
		message: String(body.message ?? ''),
	});

	if (!result.ok) {
		const status = result.error.includes('not found') ? 404 : 400;
		return jsonResponse({ ok: false, error: result.error }, status);
	}

	return jsonResponse({ ok: true, guest: result.guest });
};

export const DELETE: APIRoute = async ({ request }) => {
	if (!isValidAdminSession(getBearerToken(request))) return unauthorized();

	const removed = await clearAllRsvps();
	const supabaseClear = await clearAllRsvpsFromSupabase();
	if (!supabaseClear.ok) {
		return jsonResponse(
			{
				ok: false,
				error: `Cleared ${removed} local RSVP(s), but Supabase clear failed: ${supabaseClear.error}`,
			},
			500
		);
	}

	return jsonResponse({ ok: true, removed });
};

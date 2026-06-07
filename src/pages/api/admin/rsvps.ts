import type { APIRoute } from 'astro';
import { isValidAdminSession } from '../../../lib/admin-auth';
import { clearAllRsvps, listRsvps } from '../../../lib/rsvp-store';

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

export const GET: APIRoute = async ({ request }) => {
	if (!isValidAdminSession(getBearerToken(request))) return unauthorized();

	const rsvps = await listRsvps();
	return new Response(JSON.stringify({ ok: true, rsvps, count: rsvps.length }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

export const DELETE: APIRoute = async ({ request }) => {
	if (!isValidAdminSession(getBearerToken(request))) return unauthorized();

	const removed = await clearAllRsvps();
	return new Response(JSON.stringify({ ok: true, removed }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

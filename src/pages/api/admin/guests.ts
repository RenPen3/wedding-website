import type { APIRoute } from 'astro';
import { isValidAdminSession } from '../../../lib/admin-auth';
import { computeGuestStats, fetchAllGuests } from '../../../lib/admin-guests';

function getBearerToken(request: Request): string | undefined {
	const header = request.headers.get('authorization');
	if (!header?.startsWith('Bearer ')) return undefined;
	return header.slice(7).trim();
}

export const GET: APIRoute = async ({ request }) => {
	const token = getBearerToken(request);
	if (!isValidAdminSession(token)) {
		return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const guests = await fetchAllGuests();
		return new Response(
			JSON.stringify({
				ok: true,
				guests,
				stats: computeGuestStats(guests),
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to load guests';
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

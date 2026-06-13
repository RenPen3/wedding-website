import type { APIRoute } from 'astro';
import { isValidAdminSession } from '../../../lib/admin-auth';
import { buildGuestActivityReport } from '../../../lib/invite-opens';

function getBearerToken(request: Request): string | undefined {
	const header = request.headers.get('authorization');
	if (!header?.startsWith('Bearer ')) return undefined;
	return header.slice(7).trim();
}

/** Admin-only: merged guest-list + invite opens + RSVP activity (for future /admin/guests). */
export const GET: APIRoute = async ({ request }) => {
	if (!isValidAdminSession(getBearerToken(request))) {
		return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const activity = await buildGuestActivityReport();
		return new Response(JSON.stringify({ ok: true, activity }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to load invite activity';
		console.error('[api/admin/invite-activity]', message);
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

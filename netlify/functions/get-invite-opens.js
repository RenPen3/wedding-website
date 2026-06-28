import { getBearerToken, isValidAdminSession } from '../lib/admin-auth.js';
import { getAllInviteOpens } from '../lib/invite-open-store.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default async (request) => {
	if (request.method !== 'GET') {
		return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
			status: 405,
			headers: JSON_HEADERS,
		});
	}

	const token = getBearerToken(request);
	if (!isValidAdminSession(token)) {
		return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
			status: 401,
			headers: JSON_HEADERS,
		});
	}

	try {
		const records = await getAllInviteOpens();
		return new Response(JSON.stringify({ ok: true, records }), {
			status: 200,
			headers: JSON_HEADERS,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to load invite opens';
		console.error('[get-invite-opens] error:', message);
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 500,
			headers: JSON_HEADERS,
		});
	}
};

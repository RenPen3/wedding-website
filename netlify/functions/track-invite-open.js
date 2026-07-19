import {
	isValidInviteSlug,
	normalizeInviteSlug,
	recordInviteOpen,
} from '../lib/invite-open-store.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default async (request) => {
	if (request.method !== 'POST') {
		return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
			status: 405,
			headers: JSON_HEADERS,
		});
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
			status: 400,
			headers: JSON_HEADERS,
		});
	}

	const slug = normalizeInviteSlug(body?.slug ?? body?.invite_code ?? body?.code ?? '');

	if (!slug) {
		return new Response(JSON.stringify({ ok: false, error: 'Missing slug' }), {
			status: 400,
			headers: JSON_HEADERS,
		});
	}

	if (!isValidInviteSlug(slug)) {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid slug' }), {
			status: 400,
			headers: JSON_HEADERS,
		});
	}

	try {
		const record = await recordInviteOpen(slug);
		console.log('[track-invite-open] recorded:', slug, 'count:', record.openCount);
		return new Response(JSON.stringify({ ok: true, record }), {
			status: 200,
			headers: JSON_HEADERS,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to record invite open';
		console.error('[track-invite-open] error:', slug, message);
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 500,
			headers: JSON_HEADERS,
		});
	}
};

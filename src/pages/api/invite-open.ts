import type { APIRoute } from 'astro';
import { isValidInviteCode, normalizeInviteCode, recordInviteOpen } from '../../lib/invite-opens';

export const POST: APIRoute = async ({ request }) => {
	let body: Record<string, unknown>;

	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const invite_code = normalizeInviteCode(String(body.invite_code ?? body.code ?? ''));
	if (!isValidInviteCode(invite_code)) {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid invite code' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const page_path = String(body.page_path ?? '').trim() || null;
	const user_agent = request.headers.get('user-agent');

	const result = await recordInviteOpen({
		invite_code,
		page_path,
		user_agent,
	});

	if (!result.ok) {
		const status = result.error === 'Invite tracking is not configured' ? 503 : 500;
		return new Response(JSON.stringify({ ok: false, error: result.error }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

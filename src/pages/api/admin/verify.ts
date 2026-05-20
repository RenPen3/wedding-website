import type { APIRoute } from 'astro';
import { signAdminSession, verifyAdminPassword } from '../../../lib/admin-auth';

export const POST: APIRoute = async ({ request }) => {
	let password = '';
	const contentType = request.headers.get('content-type') ?? '';

	try {
		if (contentType.includes('application/json')) {
			const body = (await request.json()) as { password?: string };
			password = String(body.password ?? '');
		} else {
			const form = await request.formData();
			password = String(form.get('password') ?? '');
		}
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid request' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!verifyAdminPassword(password)) {
		return new Response(JSON.stringify({ ok: false, error: 'Incorrect password' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(
		JSON.stringify({ ok: true, token: signAdminSession() }),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
};

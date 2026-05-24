import type { APIRoute } from 'astro';
import { clearAllPhotos } from '../../../lib/photo-store';

export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const password = body.password;

	if (password !== import.meta.env.ADMIN_PASSWORD) {
		return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await clearAllPhotos();

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
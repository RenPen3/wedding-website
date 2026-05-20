import type { APIRoute } from 'astro';
import { deletePhoto, getPhoto } from '../../../lib/photo-store';

export const GET: APIRoute = async ({ params }) => {
	const id = params.id ?? '';
	if (!id) {
		return new Response('Not found', { status: 404 });
	}

	const photo = await getPhoto(id);
	if (!photo) {
		return new Response('Not found', { status: 404 });
	}

	return new Response(photo.buffer, {
		status: 200,
		headers: {
			'Content-Type': photo.mimeType,
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	});
};

export const DELETE: APIRoute = async ({ params, request }) => {
	const id = params.id ?? '';
	if (!id) {
		return new Response(JSON.stringify({ ok: false, error: 'Photo not found.' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let token = '';
	try {
		const body = (await request.json()) as { token?: string };
		token = String(body.token ?? '').trim();
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid request.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = await deletePhoto(id, token);
	if (!result.ok) {
		const status = result.error === 'Photo not found.' ? 404 : 403;
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

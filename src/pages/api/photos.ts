import type { APIRoute } from 'astro';
import { listPhotos, photoUrl, savePhoto } from '../../lib/photo-store';

export const GET: APIRoute = async ({ url }) => {
	const limitParam = url.searchParams.get('limit');
	const limit = limitParam ? Math.max(1, Math.min(100, Number(limitParam) || 0)) : undefined;
	const photos = await listPhotos(limit);

	return new Response(
		JSON.stringify({
			ok: true,
			photos: photos.map((p) => ({
				id: p.id,
				url: photoUrl(p.id),
				uploadedAt: p.uploadedAt,
				uploaderName: p.uploaderName ?? null,
			})),
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
};

export const POST: APIRoute = async ({ request }) => {
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid form data' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const file = form.get('photo');
	const uploaderName = String(form.get('uploaderName') ?? '').trim();

	if (!(file instanceof File) || file.size === 0) {
		return new Response(JSON.stringify({ ok: false, error: 'Please choose a photo to upload.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const result = await savePhoto(buffer, file.type || 'image/jpeg', uploaderName);

	if (!result.ok) {
		return new Response(JSON.stringify({ ok: false, error: result.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(
		JSON.stringify({
			ok: true,
			photo: {
				id: result.photo.id,
				url: photoUrl(result.photo.id),
				uploadedAt: result.photo.uploadedAt,
				uploaderName: result.photo.uploaderName ?? null,
				uploadToken: result.photo.uploadToken,
			},
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
};

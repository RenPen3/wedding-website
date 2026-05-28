import type { APIRoute } from 'astro';
import { isValidAdminSession } from '../../../lib/admin-auth';
import { listPhotos, photoUrl } from '../../../lib/photo-store';
import { SLIDESHOW_SECTIONS, isSlideshowSectionId } from '../../../lib/slideshow-constants';
import { generateSlideshowAssignments } from '../../../lib/slideshow-ai';
import { getSlideshowEntries, replaceSlideshowEntries, type SlideshowSaveItem } from '../../../lib/slideshow-store';

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

	const [entries, photos] = await Promise.all([getSlideshowEntries(false), listPhotos()]);

	return new Response(
		JSON.stringify({
			ok: true,
			sections: SLIDESHOW_SECTIONS,
			entries,
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

export const PUT: APIRoute = async ({ request }) => {
	if (!isValidAdminSession(getBearerToken(request))) return unauthorized();

	let body: { items?: SlideshowSaveItem[] };
	try {
		body = (await request.json()) as { items?: SlideshowSaveItem[] };
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const items = (body.items ?? []).filter(
		(item) => item.photo_id && isSlideshowSectionId(String(item.section_name))
	) as SlideshowSaveItem[];

	const saved = await replaceSlideshowEntries(items);

	return new Response(JSON.stringify({ ok: true, entries: saved }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

export const POST: APIRoute = async ({ request }) => {
	if (!isValidAdminSession(getBearerToken(request))) return unauthorized();

	const url = new URL(request.url);
	if (url.searchParams.get('action') !== 'generate') {
		return new Response(JSON.stringify({ ok: false, error: 'Unknown action' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const { items, analyses } = await generateSlideshowAssignments();
		if (items.length === 0) {
			return new Response(JSON.stringify({ ok: false, error: 'No gallery photos to analyze.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const saved = await replaceSlideshowEntries(items);

		return new Response(
			JSON.stringify({ ok: true, entries: saved, analyses, usedAi: Boolean(import.meta.env.OPENAI_API_KEY) }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Generation failed';
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

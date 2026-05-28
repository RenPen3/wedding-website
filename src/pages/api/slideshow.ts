import type { APIRoute } from 'astro';
import { listPhotos } from '../../lib/photo-store';
import { buildPublicSlideshow } from '../../lib/slideshow-ai';
import { SLIDESHOW_SECTIONS } from '../../lib/slideshow-constants';
import { getSlideshowEntries } from '../../lib/slideshow-store';

export const GET: APIRoute = async () => {
	const entries = await getSlideshowEntries(true);
	const photos = await listPhotos();

	const items = entries.map((e) => ({
		photo_id: e.photo_id,
		section_name: e.section_name,
		display_order: e.display_order,
		is_visible: e.is_visible,
	}));

	const sections = buildPublicSlideshow(items, photos);

	return new Response(
		JSON.stringify({
			ok: true,
			sections,
			sectionLabels: SLIDESHOW_SECTIONS,
			hasSlideshow: sections.length > 0,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
};

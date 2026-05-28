import { getPhoto, listPhotos, photoUrl, type PhotoRecord } from './photo-store';
import {
	SLIDESHOW_SECTION_IDS,
	type SlideshowSectionId,
} from './slideshow-constants';
import type { SlideshowSaveItem } from './slideshow-store';

export type PhotoAnalysis = {
	photo_id: string;
	section_name: SlideshowSectionId;
	quality_score: number;
	ai_reason: string;
	is_duplicate: boolean;
};

const OPENAI_MODEL = 'gpt-4o-mini';

function simpleHash(buffer: Buffer): string {
	let sum = 0;
	const step = Math.max(1, Math.floor(buffer.length / 64));
	for (let i = 0; i < buffer.length; i += step) {
		sum = (sum + buffer[i]!) % 9973;
	}
	return `${buffer.length}-${sum}`;
}

function heuristicScore(buffer: Buffer, mimeType: string): number {
	const sizeKb = buffer.byteLength / 1024;
	let score = 50;

	if (sizeKb > 200) score += 15;
	else if (sizeKb > 80) score += 10;
	else if (sizeKb < 30) score -= 20;

	if (mimeType.includes('jpeg') || mimeType.includes('jpg')) score += 5;
	if (mimeType.includes('webp')) score += 3;

	return Math.max(10, Math.min(95, score));
}

function heuristicSection(index: number, score: number): SlideshowSectionId {
	const primary = SLIDESHOW_SECTION_IDS.filter((id) => id !== 'more_memories');
	if (score < 40) return 'more_memories';
	return primary[index % primary.length]!;
}

async function analyzeWithOpenAI(
	buffer: Buffer,
	mimeType: string
): Promise<{ section_name: SlideshowSectionId; quality_score: number; ai_reason: string } | null> {
	const apiKey = import.meta.env.OPENAI_API_KEY;
	if (!apiKey) return null;

	const base64 = buffer.toString('base64');
	const dataUrl = `data:${mimeType};base64,${base64}`;

	try {
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: OPENAI_MODEL,
				max_tokens: 200,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: `Analyze this wedding photo. Return ONLY valid JSON with keys: section (one of: getting_ready, ceremony, reception, family, friends, dancing, more_memories), score (0-100 quality), reason (short string), blurry (boolean), faces (boolean). Prefer clear, well-lit photos with visible smiling faces for main sections. Use more_memories for unclear, blurry, or off-topic shots.`,
							},
							{ type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
						],
					},
				],
			}),
		});

		if (!res.ok) return null;

		const payload = (await res.json()) as {
			choices?: { message?: { content?: string } }[];
		};
		const content = payload.choices?.[0]?.message?.content ?? '';
		const jsonMatch = content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) return null;

		const parsed = JSON.parse(jsonMatch[0]) as {
			section?: string;
			score?: number;
			reason?: string;
			blurry?: boolean;
		};

		let section = String(parsed.section ?? 'more_memories') as SlideshowSectionId;
		if (!SLIDESHOW_SECTION_IDS.includes(section)) section = 'more_memories';

		let score = Number(parsed.score ?? 60);
		if (parsed.blurry) score -= 25;
		score = Math.max(5, Math.min(100, score));

		return {
			section_name: score < 35 ? 'more_memories' : section,
			quality_score: score,
			ai_reason: String(parsed.reason ?? 'AI analyzed'),
		};
	} catch {
		return null;
	}
}

async function analyzePhoto(photo: PhotoRecord, index: number, seenHashes: Map<string, string>) {
	const image = await getPhoto(photo.id);
	if (!image) {
		return {
			photo_id: photo.id,
			section_name: 'more_memories' as SlideshowSectionId,
			quality_score: 0,
			ai_reason: 'Image unavailable',
			is_duplicate: false,
		};
	}

	const hash = simpleHash(image.buffer);
	const duplicateOf = seenHashes.get(hash);
	if (duplicateOf) {
		return {
			photo_id: photo.id,
			section_name: 'more_memories' as SlideshowSectionId,
			quality_score: 20,
			ai_reason: 'Duplicate of another upload',
			is_duplicate: true,
		};
	}
	seenHashes.set(hash, photo.id);

	const ai = await analyzeWithOpenAI(image.buffer, image.mimeType);
	if (ai) {
		return {
			photo_id: photo.id,
			section_name: ai.section_name,
			quality_score: ai.quality_score,
			ai_reason: ai.ai_reason,
			is_duplicate: false,
		};
	}

	const score = heuristicScore(image.buffer, image.mimeType);
	return {
		photo_id: photo.id,
		section_name: heuristicSection(index, score),
		quality_score: score,
		ai_reason: 'Sorted by image quality heuristics',
		is_duplicate: false,
	};
}

export async function generateSlideshowAssignments(): Promise<{
	items: SlideshowSaveItem[];
	analyses: PhotoAnalysis[];
}> {
	const photos = await listPhotos();
	if (photos.length === 0) {
		return { items: [], analyses: [] };
	}

	const seenHashes = new Map<string, string>();
	const analyses: PhotoAnalysis[] = [];

	for (let i = 0; i < photos.length; i++) {
		const result = await analyzePhoto(photos[i]!, i, seenHashes);
		analyses.push(result);
	}

	const sectionCounts = new Map<SlideshowSectionId, number>();
	for (const id of SLIDESHOW_SECTION_IDS) sectionCounts.set(id, 0);

	const ranked = [...analyses].sort((a, b) => b.quality_score - a.quality_score);
	const maxPerSection = Math.max(3, Math.ceil(photos.length / 5));
	const chosen = new Set<string>();

	const items: SlideshowSaveItem[] = [];

	for (const analysis of ranked) {
		if (analysis.is_duplicate || analysis.quality_score < 25) {
			const order = sectionCounts.get('more_memories') ?? 0;
			items.push({
				photo_id: analysis.photo_id,
				section_name: 'more_memories',
				display_order: order,
				is_visible: analysis.quality_score >= 25,
				quality_score: analysis.quality_score,
				ai_reason: analysis.ai_reason,
			});
			sectionCounts.set('more_memories', order + 1);
			continue;
		}

		let section = analysis.section_name;
		const count = sectionCounts.get(section) ?? 0;
		if (count >= maxPerSection) {
			section = 'more_memories';
		}

		if (chosen.has(analysis.photo_id)) continue;
		chosen.add(analysis.photo_id);

		const order = sectionCounts.get(section) ?? 0;
		items.push({
			photo_id: analysis.photo_id,
			section_name: section,
			display_order: order,
			is_visible: true,
			quality_score: analysis.quality_score,
			ai_reason: analysis.ai_reason,
		});
		sectionCounts.set(section, order + 1);
	}

	for (const photo of photos) {
		if (!items.some((item) => item.photo_id === photo.id)) {
			const order = sectionCounts.get('more_memories') ?? 0;
			items.push({
				photo_id: photo.id,
				section_name: 'more_memories',
				display_order: order,
				is_visible: false,
				quality_score: 10,
				ai_reason: 'Not selected by AI',
			});
			sectionCounts.set('more_memories', order + 1);
		}
	}

	return { items, analyses };
}

export function buildPublicSlideshow(
	entries: SlideshowSaveItem[],
	photos: PhotoRecord[]
) {
	const photoMap = new Map(photos.map((p) => [p.id, p]));

	return SLIDESHOW_SECTION_IDS.map((sectionId) => ({
		id: sectionId,
		photos: entries
			.filter((e) => e.section_name === sectionId && e.is_visible)
			.sort((a, b) => a.display_order - b.display_order)
			.map((e) => {
				const photo = photoMap.get(e.photo_id);
				return {
					photo_id: e.photo_id,
					url: photoUrl(e.photo_id),
					uploaderName: photo?.uploaderName ?? null,
					display_order: e.display_order,
				};
			}),
	})).filter((section) => section.photos.length > 0);
}

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { createAdminSupabase } from './supabase';
import type { SlideshowSectionId } from './slideshow-constants';
import { isSlideshowSectionId } from './slideshow-constants';

export type SlideshowEntry = {
	id: string;
	photo_id: string;
	section_name: SlideshowSectionId;
	display_order: number;
	is_visible: boolean;
	quality_score: number | null;
	ai_reason: string | null;
	created_at: string;
	updated_at: string;
};

export type SlideshowSaveItem = {
	photo_id: string;
	section_name: SlideshowSectionId;
	display_order: number;
	is_visible: boolean;
	quality_score?: number | null;
	ai_reason?: string | null;
};

const BLOB_STORE = 'wedding-slideshow';
const BLOB_KEY = 'sections';
const dataPath = fileURLToPath(new URL('../data/slideshow-sections.json', import.meta.url));

let writeChain: Promise<void> = Promise.resolve();
let storageMode: 'supabase' | 'blob' | 'file' | null = null;

function netlifyBlobsConfigured(): boolean {
	return (
		process.env.NETLIFY === 'true' ||
		Boolean(process.env.NETLIFY_BLOBS_CONTEXT) ||
		typeof (globalThis as { netlifyBlobsContext?: unknown }).netlifyBlobsContext !== 'undefined'
	);
}

function getBlobStore() {
	return getStore({ name: BLOB_STORE, consistency: 'strong' });
}

async function resolveStorageMode(): Promise<'supabase' | 'blob' | 'file'> {
	if (storageMode) return storageMode;
	if (createAdminSupabase()) {
		storageMode = 'supabase';
		return storageMode;
	}
	if (netlifyBlobsConfigured()) {
		storageMode = 'blob';
		return storageMode;
	}
	storageMode = 'file';
	return storageMode;
}

function normalizeEntry(raw: Record<string, unknown>): SlideshowEntry | null {
	const section = String(raw.section_name ?? '');
	if (!isSlideshowSectionId(section)) return null;

	return {
		id: String(raw.id ?? randomUUID()),
		photo_id: String(raw.photo_id ?? ''),
		section_name: section,
		display_order: Number(raw.display_order ?? 0),
		is_visible: raw.is_visible !== false,
		quality_score: raw.quality_score != null ? Number(raw.quality_score) : null,
		ai_reason: raw.ai_reason != null ? String(raw.ai_reason) : null,
		created_at: String(raw.created_at ?? new Date().toISOString()),
		updated_at: String(raw.updated_at ?? new Date().toISOString()),
	};
}

async function readFromFile(): Promise<SlideshowEntry[]> {
	try {
		const raw = await readFile(dataPath, 'utf-8');
		const parsed = JSON.parse(raw) as Record<string, unknown>[];
		return parsed.map(normalizeEntry).filter((e): e is SlideshowEntry => e !== null);
	} catch {
		return [];
	}
}

async function writeToFile(entries: SlideshowEntry[]): Promise<void> {
	await writeFile(dataPath, JSON.stringify(entries, null, '\t'), 'utf-8');
}

async function readEntries(): Promise<SlideshowEntry[]> {
	const mode = await resolveStorageMode();

	if (mode === 'supabase') {
		const admin = createAdminSupabase();
		if (admin) {
			const { data, error } = await admin
				.from('photo_slideshow_sections')
				.select('*')
				.order('display_order', { ascending: true });

			if (!error && data) {
				return data
					.map((row) => normalizeEntry(row as Record<string, unknown>))
					.filter((e): e is SlideshowEntry => e !== null);
			}
		}
	}

	if (mode === 'blob') {
		const stored = await getBlobStore().get(BLOB_KEY, { type: 'json' });
		if (stored != null) {
			return (stored as Record<string, unknown>[])
				.map(normalizeEntry)
				.filter((e): e is SlideshowEntry => e !== null);
		}
	}

	return readFromFile();
}

async function writeEntries(entries: SlideshowEntry[]): Promise<void> {
	const mode = await resolveStorageMode();

	if (mode === 'supabase') {
		const admin = createAdminSupabase();
		if (admin) {
			await admin.from('photo_slideshow_sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
			if (entries.length > 0) {
				const { error } = await admin.from('photo_slideshow_sections').insert(entries);
				if (error) throw new Error(error.message);
			}
			await writeToFile(entries);
			return;
		}
	}

	if (mode === 'blob') {
		await getBlobStore().setJSON(BLOB_KEY, entries);
	}
	await writeToFile(entries);
}

export async function getSlideshowEntries(visibleOnly = false): Promise<SlideshowEntry[]> {
	const entries = await readEntries();
	const filtered = visibleOnly ? entries.filter((e) => e.is_visible) : entries;
	return filtered.sort((a, b) => {
		if (a.section_name !== b.section_name) {
			return a.section_name.localeCompare(b.section_name);
		}
		return a.display_order - b.display_order;
	});
}

export async function saveSlideshowLayout(items: SlideshowSaveItem[]): Promise<SlideshowEntry[]> {
	const now = new Date().toISOString();
	const entries: SlideshowEntry[] = items.map((item) => ({
		id: randomUUID(),
		photo_id: item.photo_id,
		section_name: item.section_name,
		display_order: item.display_order,
		is_visible: item.is_visible,
		quality_score: item.quality_score ?? null,
		ai_reason: item.ai_reason ?? null,
		created_at: now,
		updated_at: now,
	}));

	await (writeChain = writeChain.then(async () => {
		await writeEntries(entries);
	}));

	return entries;
}

export async function replaceSlideshowEntries(items: SlideshowSaveItem[]): Promise<SlideshowEntry[]> {
	return saveSlideshowLayout(items);
}

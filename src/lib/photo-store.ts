import { supabase } from '../db/supabase';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export type PhotoRecord = {
	id: string;
	mimeType: string;
	uploadedAt: string;
	uploaderName?: string;
	uploadToken: string;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const metaPath = fileURLToPath(new URL('../data/photos.json', import.meta.url));
const galleryDir = fileURLToPath(new URL('../../public/gallery', import.meta.url));
const BLOB_STORE = 'wedding-photos';
const META_KEY = 'index';

let writeChain: Promise<void> = Promise.resolve();
let storageMode: 'blob' | 'file' | null = null;

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

async function resolveStorageMode(): Promise<'blob' | 'file'> {
	if (storageMode) return storageMode;
	if (!netlifyBlobsConfigured()) {
		storageMode = 'file';
		return storageMode;
	}
	try {
		await getBlobStore().get(META_KEY, { type: 'json' });
		storageMode = 'blob';
	} catch {
		storageMode = 'file';
	}
	return storageMode;
}

function extensionForMime(mimeType: string): string {
	switch (mimeType) {
		case 'image/png':
			return 'png';
		case 'image/webp':
			return 'webp';
		case 'image/gif':
			return 'gif';
		default:
			return 'jpg';
	}
}

function normalizeRecord(raw: PhotoRecord & { uploadToken?: string }): PhotoRecord {
	return {
		id: raw.id,
		mimeType: raw.mimeType,
		uploadedAt: raw.uploadedAt,
		uploaderName: raw.uploaderName,
		uploadToken: raw.uploadToken ?? '',
	};
}

async function readRecords(): Promise<PhotoRecord[]> {
	const mode = await resolveStorageMode();
	let records: PhotoRecord[] = [];

	if (mode === 'file') {
		try {
			const raw = await readFile(metaPath, 'utf-8');
			records = JSON.parse(raw) as PhotoRecord[];
		} catch {
			return [];
		}
	} else {
		const stored = await getBlobStore().get(META_KEY, { type: 'json' });
		if (stored == null) return [];
		records = stored as PhotoRecord[];
	}

	return records.map((r) => normalizeRecord(r));
}

async function writeRecords(records: PhotoRecord[]): Promise<void> {
	const mode = await resolveStorageMode();
	if (mode === 'file') {
		await writeFile(metaPath, JSON.stringify(records, null, '\t'), 'utf-8');
		return;
	}
	await getBlobStore().setJSON(META_KEY, records);
}

export function photoUrl(id: string): string {
	return `/api/photos/${id}`;
}

export async function listPhotos(limit?: number): Promise<PhotoRecord[]> {
	const records = await readRecords();
	const sorted = records.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
	return limit ? sorted.slice(0, limit) : sorted;
}

export async function savePhoto(
	buffer: Buffer,
	mimeType: string,
	uploaderName?: string
): Promise<{ ok: true; photo: PhotoRecord } | { ok: false; error: string }> {
	if (!ALLOWED_TYPES.has(mimeType)) {
		return { ok: false, error: 'Please upload a JPG, PNG, WebP, or GIF image.' };
	}
	if (buffer.byteLength > MAX_BYTES) {
		return { ok: false, error: 'Image must be 5 MB or smaller.' };
	}

	const photo: PhotoRecord = {
		id: randomUUID(),
		mimeType,
		uploadedAt: new Date().toISOString(),
		uploaderName: uploaderName?.trim() || undefined,
		uploadToken: randomUUID(),
	};

const ext = extensionForMime(mimeType);
const filePath = `guest-uploads/${photo.id}.${ext}`;

const { error: uploadError } = await supabase.storage
	.from('wedding-uploads')
	.upload(filePath, buffer, {
		contentType: mimeType,
		upsert: false,
	});

if (uploadError) {
	console.error('Supabase storage upload error:', uploadError);
	return { ok: false, error: 'Could not upload photo. Please try again.' };
}

const { error: insertError } = await supabase.from('wedding_photos').insert({
	id: photo.id,
	guest_name: uploaderName?.trim() || null,
	file_path: filePath,
	file_name: `${photo.id}.${ext}`,
	file_type: mimeType,
	file_size: buffer.byteLength,
	synced_to_nas: false,
	delete_requested: false,
	deleted_from_nas: false
});

if (insertError) {
	console.error('Supabase database insert error:', insertError);
	return {
		ok: false,
		error: `Database error: ${insertError.message}`
	};
}

	await (writeChain = writeChain.then(async () => {
		const records = await readRecords();
		records.unshift(photo);
		await writeRecords(records);
	}));

	return { ok: true, photo };
}

export async function getPhoto(
	id: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
	const records = await readRecords();
	const record = records.find((r) => r.id === id);
	if (!record) return null;

	const ext = extensionForMime(record.mimeType);
	const filePath = `guest-uploads/${id}.${ext}`;

	const { data, error } = await supabase.storage
		.from('wedding-uploads')
		.download(filePath);

	if (error || !data) {
		console.error('Supabase image download error:', error);
		return null;
	}

	const arrayBuffer = await data.arrayBuffer();

	return {
		buffer: Buffer.from(arrayBuffer),
		mimeType: record.mimeType,
	};
}

export async function deletePhoto(
	id: string,
	token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (!token.trim()) {
		return { ok: false, error: 'Missing upload token.' };
	}

	return (writeChain = writeChain.then(async () => {
		const records = await readRecords();
		const record = records.find((r) => r.id === id);

		if (!record) {
			return { ok: false as const, error: 'Photo not found.' };
		}

		if (!record.uploadToken || record.uploadToken !== token) {
			return { ok: false as const, error: 'You can only remove photos you uploaded.' };
		}

		const ext = extensionForMime(record.mimeType);
		const filePath = `guest-uploads/${id}.${ext}`;

		const { error: storageError } = await supabase.storage
			.from('wedding-uploads')
			.remove([filePath]);

		if (storageError) {
			console.error('Supabase storage delete error:', storageError);
		}

		const { error: updateError } = await supabase
			.from('wedding_photos')
			.update({
				delete_requested: true,
			})
			.eq('id', id);

		if (updateError) {
			console.error('Supabase delete request update error:', updateError);
			return { ok: false as const, error: 'Could not remove photo. Please try again.' };
		}

		await writeRecords(records.filter((r) => r.id !== id));

		return { ok: true as const };
	}));
}

export async function clearAllPhotos(): Promise<void> {
	await (writeChain = writeChain.then(async () => {
		const records = await readRecords();
		const mode = await resolveStorageMode();

		for (const record of records) {
			if (mode === 'file') {
				const ext = extensionForMime(record.mimeType);
				try {
					await unlink(join(galleryDir, `${record.id}.${ext}`));
				} catch {
					// File may already be missing
				}
			} else {
				try {
					await getBlobStore().delete(`photo-${record.id}`);
				} catch {
					// Blob may already be missing
				}
			}
		}

		await writeRecords([]);
	}));
}

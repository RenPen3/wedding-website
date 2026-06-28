import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'wedding-invite-opens';
const INVITE_CODE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const dataPath = join(
	fileURLToPath(new URL('../../src/data/invite-opens.json', import.meta.url)),
);

/** @typedef {{ slug: string, opened: boolean, firstOpenedAt: string, lastOpenedAt: string, openCount: number }} InviteOpenRecord */

function netlifyBlobsConfigured() {
	return (
		process.env.NETLIFY === 'true' ||
		Boolean(process.env.NETLIFY_BLOBS_CONTEXT) ||
		typeof globalThis.netlifyBlobsContext !== 'undefined'
	);
}

function getBlobStore() {
	return getStore({ name: STORE_NAME, consistency: 'strong' });
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeInviteSlug(raw) {
	return String(raw ?? '')
		.trim()
		.toLowerCase();
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isValidInviteSlug(slug) {
	return Boolean(slug) && INVITE_CODE_RE.test(slug) && slug.length <= 120;
}

/**
 * @returns {Promise<Record<string, InviteOpenRecord>>}
 */
async function readFileStore() {
	try {
		const raw = await readFile(dataPath, 'utf-8');
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

/**
 * @param {Record<string, InviteOpenRecord>} records
 */
async function writeFileStore(records) {
	await mkdir(dirname(dataPath), { recursive: true });
	await writeFile(dataPath, JSON.stringify(records, null, '\t'), 'utf-8');
}

/**
 * @param {string} slug
 * @returns {Promise<InviteOpenRecord | null>}
 */
async function readRecord(slug) {
	if (netlifyBlobsConfigured()) {
		const stored = await getBlobStore().get(slug, { type: 'json' });
		return stored ?? null;
	}

	const records = await readFileStore();
	return records[slug] ?? null;
}

/**
 * @param {string} slug
 * @param {InviteOpenRecord} record
 */
async function writeRecord(slug, record) {
	if (netlifyBlobsConfigured()) {
		await getBlobStore().setJSON(slug, record);
		return;
	}

	const records = await readFileStore();
	records[slug] = record;
	await writeFileStore(records);
}

/**
 * @param {string} slug
 * @returns {Promise<InviteOpenRecord>}
 */
export async function recordInviteOpen(slug) {
	const normalized = normalizeInviteSlug(slug);
	if (!isValidInviteSlug(normalized)) {
		throw new Error('Invalid invite slug');
	}

	const now = new Date().toISOString();
	const existing = await readRecord(normalized);

	if (existing) {
		/** @type {InviteOpenRecord} */
		const updated = {
			slug: normalized,
			opened: true,
			firstOpenedAt: existing.firstOpenedAt,
			lastOpenedAt: now,
			openCount: existing.openCount + 1,
		};
		await writeRecord(normalized, updated);
		return updated;
	}

	/** @type {InviteOpenRecord} */
	const created = {
		slug: normalized,
		opened: true,
		firstOpenedAt: now,
		lastOpenedAt: now,
		openCount: 1,
	};
	await writeRecord(normalized, created);
	return created;
}

/**
 * @returns {Promise<InviteOpenRecord[]>}
 */
export async function getAllInviteOpens() {
	if (netlifyBlobsConfigured()) {
		const store = getBlobStore();
		const records = [];
		let cursor;

		do {
			const page = await store.list({ cursor });
			for (const blob of page.blobs) {
				const record = await store.get(blob.key, { type: 'json' });
				if (record) records.push(record);
			}
			cursor = page.next_cursor;
		} while (cursor);

		return records.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
	}

	const records = await readFileStore();
	return Object.values(records).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

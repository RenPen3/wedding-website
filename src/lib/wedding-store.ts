import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStore } from '@netlify/blobs';
import weddingSeedJson from '../data/wedding-state.json';

export type Guest = {
	slug: string;
	displayName: string;
};

export type Visit = {
	slug: string;
	at: string;
	userAgent: string | null;
};

export type Rsvp = {
	slug: string;
	displayName: string;
	attending: boolean;
	guestCount: number;
	dietary: string;
	message: string;
	at: string;
};

export type WeddingState = {
	guests: Guest[];
	visits: Visit[];
	rsvps: Rsvp[];
};

const BLOB_STORE = 'wedding-state';
const BLOB_KEY = 'app';

const storePath = fileURLToPath(new URL('../data/wedding-state.json', import.meta.url));

let writeChain: Promise<void> = Promise.resolve();

let storageMode: 'blob' | 'file' | null = null;

function netlifyBlobsConfigured(): boolean {
	return (
		process.env.NETLIFY === 'true' ||
		Boolean(process.env.NETLIFY_BLOBS_CONTEXT) ||
		typeof (globalThis as { netlifyBlobsContext?: unknown }).netlifyBlobsContext !== 'undefined'
	);
}

function getSeedState(): WeddingState {
	return structuredClone(weddingSeedJson as WeddingState);
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
		await getBlobStore().get(BLOB_KEY, { type: 'json' });
		storageMode = 'blob';
	} catch {
		storageMode = 'file';
	}
	return storageMode;
}

async function readState(): Promise<WeddingState> {
	const mode = await resolveStorageMode();
	if (mode === 'file') {
		const raw = await readFile(storePath, 'utf-8');
		return JSON.parse(raw) as WeddingState;
	}
	const store = getBlobStore();
	const existing = await store.get(BLOB_KEY, { type: 'json' });
	if (existing !== null && existing !== undefined) {
		return existing as WeddingState;
	}
	const initial = getSeedState();
	await store.setJSON(BLOB_KEY, initial);
	return initial;
}

async function writeState(state: WeddingState): Promise<void> {
	const mode = await resolveStorageMode();
	if (mode === 'file') {
		await mkdir(dirname(storePath), { recursive: true });
		await writeFile(storePath, JSON.stringify(state, null, '\t'), 'utf-8');
		return;
	}
	await getBlobStore().setJSON(BLOB_KEY, state);
}

function queueWrite(fn: (state: WeddingState) => WeddingState): Promise<void> {
	writeChain = writeChain.then(async () => {
		const state = await readState();
		const next = fn(structuredClone(state));
		await writeState(next);
	});
	return writeChain;
}

export async function getState(): Promise<WeddingState> {
	return readState();
}

export function findGuest(state: WeddingState, slug: string): Guest | undefined {
	return state.guests.find((g) => g.slug === slug);
}

export async function appendVisit(slug: string, userAgent: string | null): Promise<void> {
	await queueWrite((state) => {
		state.visits.push({
			slug,
			at: new Date().toISOString(),
			userAgent,
		});
		return state;
	});
}

export async function upsertRsvp(payload: Omit<Rsvp, 'at'> & { at?: string }): Promise<void> {
	await queueWrite((state) => {
		const at = payload.at ?? new Date().toISOString();
		const idx = state.rsvps.findIndex((r) => r.slug === payload.slug);
		const row: Rsvp = {
			slug: payload.slug,
			displayName: payload.displayName,
			attending: payload.attending,
			guestCount: payload.guestCount,
			dietary: payload.dietary,
			message: payload.message,
			at,
		};
		if (idx === -1) state.rsvps.push(row);
		else state.rsvps[idx] = row;
		return state;
	});
}

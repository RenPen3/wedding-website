/**
 * DISABLED — legacy slug-based wedding state store (uses src/data/wedding-state.json).
 *
 * This module is no longer used anywhere in the app. The active RSVP system lives in
 * `rsvp-store.ts` (backed by `guest-list.json` + `rsvps.json`). The entire implementation
 * below is commented out so it cannot run, but it is kept here intentionally as a backup
 * in case the old slug/visit-tracking flow is ever needed again.
 *
 * To re-enable: remove the surrounding block comment.
 */

/*
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStore } from '@netlify/blobs';
import weddingSeedJson from '../data/wedding-state.json';

export type Guest = {
	slug: string;
	displayName: string;
	maxGuests: number;
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
	return normalizeState(structuredClone(weddingSeedJson as WeddingState));
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

function normalizeGuest(g: Guest & { maxGuests?: number }): Guest {
	return {
		slug: g.slug,
		displayName: g.displayName,
		maxGuests: typeof g.maxGuests === 'number' && g.maxGuests >= 1 ? Math.floor(g.maxGuests) : 1,
	};
}

function normalizeState(state: WeddingState): WeddingState {
	return {
		...state,
		guests: state.guests.map((g) => normalizeGuest(g as Guest & { maxGuests?: number })),
	};
}

async function readState(): Promise<WeddingState> {
	const mode = await resolveStorageMode();
	if (mode === 'file') {
		const raw = await readFile(storePath, 'utf-8');
		return normalizeState(JSON.parse(raw) as WeddingState);
	}
	const store = getBlobStore();
	const existing = await store.get(BLOB_KEY, { type: 'json' });
	if (existing !== null && existing !== undefined) {
		return normalizeState(existing as WeddingState);
	}
	const initial = normalizeState(getSeedState());
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
	const guest = state.guests.find((g) => g.slug === slug);
	return guest ? normalizeGuest(guest) : undefined;
}

export function validateGuestCount(guest: Guest, attending: boolean, guestCount: number): string | null {
	if (!attending) return null;
	if (!Number.isInteger(guestCount) || guestCount < 1) {
		return 'Guest count must be at least 1.';
	}
	if (guestCount > guest.maxGuests) {
		return `Guest count cannot exceed ${guest.maxGuests}.`;
	}
	return null;
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
*/

export {};

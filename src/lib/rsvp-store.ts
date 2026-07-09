import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStore } from '@netlify/blobs';
import { buildGuestListIndex, type GuestListEntry } from './guest-list';

export type InvitedGuest = {
	name: string;
	maxGuests: number;
};

export type RsvpSource = 'guest' | 'manual';

export type SavedRsvp = {
	name: string;
	firstName: string;
	lastName: string;
	attending: boolean;
	guestCount: number;
	guestNames: string[];
	message: string;
	submittedAt: string;
	rsvpSource: RsvpSource;
};

const BLOB_STORE = 'wedding-rsvps';
const BLOB_KEY = 'responses';

const rsvpsPath = fileURLToPath(new URL('../data/rsvps.json', import.meta.url));

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
		await getBlobStore().get(BLOB_KEY, { type: 'json' });
		storageMode = 'blob';
	} catch {
		storageMode = 'file';
	}
	return storageMode;
}

export function normalizeName(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function loadInvitedGuests(): InvitedGuest[] {
	return buildGuestListIndex().map((entry: GuestListEntry) => ({
		name: entry.name,
		maxGuests: entry.maxGuests,
	}));
}

export function findInvitedGuest(query: string): InvitedGuest | null {
	const norm = normalizeName(query);
	if (!norm) return null;

	const guests = loadInvitedGuests();
	const exact = guests.find((g) => normalizeName(g.name) === norm);
	if (exact) return exact;

	return (
		guests.find((g) => {
			const guestNorm = normalizeName(g.name);
			return guestNorm.includes(norm) || norm.includes(guestNorm);
		}) ?? null
	);
}

async function readRsvps(): Promise<SavedRsvp[]> {
	const mode = await resolveStorageMode();
	if (mode === 'file') {
		try {
			const raw = await readFile(rsvpsPath, 'utf-8');
			return JSON.parse(raw) as SavedRsvp[];
		} catch {
			return [];
		}
	}

	const stored = await getBlobStore().get(BLOB_KEY, { type: 'json' });
	if (stored == null) return [];
	return stored as SavedRsvp[];
}

async function writeRsvps(rsvps: SavedRsvp[]): Promise<void> {
	const mode = await resolveStorageMode();
	if (mode === 'file') {
		await mkdir(dirname(rsvpsPath), { recursive: true });
		await writeFile(rsvpsPath, JSON.stringify(rsvps, null, '\t'), 'utf-8');
		return;
	}
	await getBlobStore().setJSON(BLOB_KEY, rsvps);
}

export async function listRsvps(): Promise<SavedRsvp[]> {
	return readRsvps();
}

/** Removes every saved RSVP (used to clear test submissions). Returns how many were deleted. */
export async function clearAllRsvps(): Promise<number> {
	let removed = 0;
	await (writeChain = writeChain.then(async () => {
		const existing = await readRsvps();
		removed = existing.length;
		await writeRsvps([]);
	}));
	return removed;
}

export async function getRsvpForGuest(name: string): Promise<SavedRsvp | null> {
	const norm = normalizeName(name);
	const rsvps = await readRsvps();
	return rsvps.find((r) => normalizeName(r.name) === norm) ?? null;
}

/** Removes a saved RSVP for the invited guest (used when resetting to pending). */
export async function deleteRsvpForGuest(name: string): Promise<boolean> {
	const norm = normalizeName(name);
	if (!norm) return false;

	let removed = false;
	await (writeChain = writeChain.then(async () => {
		const rsvps = await readRsvps();
		const next = rsvps.filter((r) => normalizeName(r.name) !== norm);
		removed = next.length !== rsvps.length;
		if (removed) await writeRsvps(next);
	}));
	return removed;
}

export function validateGuestCount(
	guest: InvitedGuest,
	attending: boolean,
	guestCount: number
): string | null {
	if (!attending) return null;
	if (!Number.isInteger(guestCount) || guestCount < 1) {
		return 'Guest count must be at least 1.';
	}
	if (guestCount > guest.maxGuests) {
		return `Your invitation reserves up to ${guest.maxGuests} seat(s). Please remove extra names.`;
	}
	return null;
}

export function validateGuestNames(attending: boolean, guestCount: number, guestNames: string[]): string | null {
	if (!attending) return null;
	if (guestNames.length !== guestCount) {
		return 'Please provide a name for each guest.';
	}
	if (guestNames.some((n) => !n.trim())) {
		return 'All guest names are required.';
	}
	return null;
}

function splitFullName(full: string): { firstName: string; lastName: string } {
	const parts = full.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return { firstName: '', lastName: '' };
	if (parts.length === 1) return { firstName: parts[0], lastName: '' };
	return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export async function saveRsvp(
	payload: {
		name: string;
		firstName?: string;
		lastName?: string;
		attending: boolean;
		guestCount: number;
		guestNames: string[];
		message: string;
	},
	options?: { guest?: InvitedGuest; source?: RsvpSource; submittedAt?: string }
): Promise<{ ok: true; rsvp: SavedRsvp } | { ok: false; error: string }> {
	const guest = options?.guest ?? findInvitedGuest(payload.name);
	if (!guest) {
		return { ok: false, error: 'Guest not found on the invitation list.' };
	}

	const guestCount = payload.attending ? payload.guestCount : 0;
	const countError = validateGuestCount(guest, payload.attending, guestCount);
	if (countError) return { ok: false, error: countError };

	const namesError = validateGuestNames(payload.attending, guestCount, payload.guestNames);
	if (namesError) return { ok: false, error: namesError };

	const resolvedNames = splitFullName(guest.name);
	const rsvp: SavedRsvp = {
		name: guest.name,
		firstName: payload.firstName?.trim() || resolvedNames.firstName,
		lastName: payload.lastName?.trim() || resolvedNames.lastName,
		attending: payload.attending,
		guestCount,
		guestNames: payload.attending ? payload.guestNames.map((n) => n.trim()) : [],
		message: payload.message.trim(),
		submittedAt: options?.submittedAt ?? new Date().toISOString(),
		rsvpSource: options?.source ?? 'guest',
	};

	await (writeChain = writeChain.then(async () => {
		const rsvps = await readRsvps();
		const norm = normalizeName(guest.name);
		const idx = rsvps.findIndex((r) => normalizeName(r.name) === norm);
		if (idx === -1) rsvps.push(rsvp);
		else rsvps[idx] = rsvp;
		await writeRsvps(rsvps);
	}));

	return { ok: true, rsvp };
}

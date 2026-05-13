import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const storePath = fileURLToPath(new URL('../../data/wedding-state.json', import.meta.url));

let writeChain: Promise<void> = Promise.resolve();

async function readState(): Promise<WeddingState> {
	const raw = await readFile(storePath, 'utf-8');
	return JSON.parse(raw) as WeddingState;
}

async function writeState(state: WeddingState): Promise<void> {
	await mkdir(dirname(storePath), { recursive: true });
	await writeFile(storePath, JSON.stringify(state, null, '\t'), 'utf-8');
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

export async function appendVisit(
	slug: string,
	userAgent: string | null,
): Promise<void> {
	await queueWrite((state) => {
		state.visits.push({
			slug,
			at: new Date().toISOString(),
			userAgent,
		});
		return state;
	});
}

export async function upsertRsvp(
	payload: Omit<Rsvp, 'at'> & { at?: string },
): Promise<void> {
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

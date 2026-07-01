/**
 * Server-side guest search for the RSVP name dropdown.
 * Reads from src/data/guest-list.json — use from API routes only.
 */
import { buildGuestListIndex, guestSlug, type GuestListEntry } from './guest-list';
import { getRsvpForGuest, normalizeName } from './rsvp-store';

export { guestSlug };

export type GuestSearchResult = {
	id: string;
	name: string;
	first_name: string;
	last_name: string;
	full_name: string;
	/** Seats reserved on this invitation (from guest-list.json). */
	maxGuests: number;
	invite_code: string;
};

export type GuestLookupResult = GuestSearchResult & {
	rsvp: {
		attending: boolean;
		guestCount: number;
		guestNames: string[];
		message: string;
	} | null;
};

function splitName(full: string): { first_name: string; last_name: string } {
	const parts = full.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return { first_name: '', last_name: '' };
	if (parts.length === 1) return { first_name: parts[0], last_name: '' };
	return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

function toSearchResult(entry: GuestListEntry): GuestSearchResult {
	const { first_name, last_name } = splitName(entry.name);
	return {
		id: entry.id,
		name: entry.name,
		first_name,
		last_name,
		full_name: entry.name,
		maxGuests: entry.maxGuests,
		invite_code: entry.invite_code,
	};
}

function normalizeQuery(raw: string): string {
	return normalizeName(raw);
}

function namesMatch(query: string, fullName: string): boolean {
	const q = normalizeQuery(query);
	if (q.length < 2) return false;

	const full = normalizeQuery(fullName);
	const { first_name, last_name } = splitName(fullName);
	const first = normalizeQuery(first_name);
	const last = normalizeQuery(last_name);

	if (full && (full.includes(q) || q.includes(full))) return true;
	if (first && first.includes(q)) return true;
	if (last && last.includes(q)) return true;

	const parts = q.split(' ').filter(Boolean);
	if (parts.length >= 2 && full) {
		return parts.every((p) => full.includes(p));
	}

	return false;
}

async function lookupRsvp(name: string): Promise<GuestLookupResult['rsvp']> {
	const existing = await getRsvpForGuest(name);
	if (!existing) return null;

	return {
		attending: existing.attending,
		guestCount: existing.guestCount,
		guestNames: existing.guestNames,
		message: existing.message,
	};
}

export async function searchGuests(query: string, limit = 8): Promise<GuestSearchResult[]> {
	const q = query.trim();
	if (q.length < 2) return [];

	const matches = buildGuestListIndex()
		.filter((entry) => namesMatch(q, entry.name))
		.map(toSearchResult)
		.sort((a, b) => a.full_name.localeCompare(b.full_name))
		.slice(0, limit);

	console.log('[guest-search] searched query:', q, 'matches found:', matches.length);

	return matches;
}

export async function getGuestById(id: string): Promise<GuestLookupResult | null> {
	const trimmed = id.trim();
	if (!trimmed) return null;

	const entry = buildGuestListIndex().find((row) => row.id === trimmed);
	if (!entry) return null;

	const base = toSearchResult(entry);
	return { ...base, rsvp: await lookupRsvp(entry.name) };
}

export async function getGuestByInviteCode(code: string): Promise<GuestLookupResult | null> {
	const normalized = code.trim().toLowerCase();
	if (!normalized) return null;

	const entry = buildGuestListIndex().find((row) => row.invite_code === normalized);
	if (!entry) return null;

	const base = toSearchResult(entry);
	return { ...base, rsvp: await lookupRsvp(entry.name) };
}

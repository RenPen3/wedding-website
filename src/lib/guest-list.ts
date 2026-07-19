/**
 * Single source of truth for guest-list.json entries.
 * Used by RSVP lookup, invite links, and admin activity reports.
 */
import guestListJson from '../data/guest-list.json';

export type RawGuestListRow = {
	name?: string;
	maxGuests?: number;
	guest_count?: number;
	invite_code?: string;
};

export type GuestListEntry = {
	name: string;
	/** Seats reserved for this invitation (from maxGuests or guest_count). */
	maxGuests: number;
	/** Stable id for guest-lookup by id (slug-based). */
	id: string;
	/** Invite link slug — explicit invite_code from JSON or derived from name. */
	invite_code: string;
};

export function guestSlug(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Reserved seat count from guest-list.json (`maxGuests` or `guest_count`). */
export function parseReservedGuestCount(row: RawGuestListRow): number {
	const raw = row.maxGuests ?? row.guest_count;
	if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 1) {
		return Math.floor(raw);
	}
	return 1;
}

let cachedIndex: GuestListEntry[] | null = null;

/** All guests from guest-list.json with ids and invite codes resolved. */
export function buildGuestListIndex(): GuestListEntry[] {
	if (cachedIndex) return cachedIndex;

	const slugCounts = new Map<string, number>();
	const explicitCodeCounts = new Map<string, number>();

	cachedIndex = (guestListJson as RawGuestListRow[]).map((row) => {
		const name = String(row.name ?? '').trim();
		const maxGuests = parseReservedGuestCount(row);

		const base = guestSlug(name);
		const slugOccurrence = (slugCounts.get(base) ?? 0) + 1;
		slugCounts.set(base, slugOccurrence);
		const id = slugOccurrence === 1 ? base : `${base}-${slugOccurrence}`;

		const explicit = String(row.invite_code ?? '').trim().toLowerCase();
		let invite_code: string;
		if (explicit) {
			const codeOccurrence = (explicitCodeCounts.get(explicit) ?? 0) + 1;
			explicitCodeCounts.set(explicit, codeOccurrence);
			invite_code = codeOccurrence === 1 ? explicit : `${explicit}-${codeOccurrence}`;
		} else {
			invite_code = id;
		}

		return { name, maxGuests, id, invite_code };
	});

	return cachedIndex;
}

export function findGuestListEntryByInviteCode(code: string): GuestListEntry | null {
	const normalized = code.trim().toLowerCase();
	if (!normalized) return null;
	return buildGuestListIndex().find((entry) => entry.invite_code === normalized) ?? null;
}

export function findGuestListEntryById(id: string): GuestListEntry | null {
	const trimmed = id.trim();
	if (!trimmed) return null;
	return buildGuestListIndex().find((entry) => entry.id === trimmed) ?? null;
}

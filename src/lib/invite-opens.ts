/**
 * Server-side invite open tracking (Netlify Blobs).
 * Client scripts should POST to `/.netlify/functions/track-invite-open`.
 */
import { formatGuestNamesList, parseGuestNames } from './guest-names';
import { buildGuestListIndex } from './guest-list';
import { createAdminSupabase } from './supabase';
import { getGuestByInviteCode } from './guest-search';
import { normalizeName } from './rsvp-store';

type BlobInviteOpenRecord = {
	slug: string;
	opened: boolean;
	firstOpenedAt: string;
	lastOpenedAt: string;
	openCount: number;
};

async function loadBlobStore() {
	return import('../../netlify/lib/invite-open-store.js');
}

export type InviteOpenSummary = {
	invite_code: string;
	guest_name: string | null;
	first_opened_at: string;
	last_opened_at: string;
	open_count: number;
};

export type GuestActivityRow = {
	invite_code: string;
	guest_name: string;
	max_guests: number;
	invite_opened: boolean;
	first_opened_at: string | null;
	last_opened_at: string | null;
	open_count: number;
	rsvp_submitted: boolean;
	rsvp_attending: boolean | null;
	rsvp_total_attending: number | null;
	rsvp_guest_names: string | null;
	rsvp_guest_names_list: string[];
	rsvp_message: string | null;
	rsvp_submitted_at: string | null;
	rsvp_source: 'guest' | 'manual' | null;
};

export type GuestActivityStats = {
	total: number;
	opened: number;
	notOpened: number;
	rsvpAttending: number;
	rsvpDeclined: number;
	rsvpPending: number;
	totalAttending: number;
};

const INVITE_CODE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeInviteCode(raw: string): string {
	return raw.trim().toLowerCase();
}

export function isValidInviteCode(code: string): boolean {
	return Boolean(code) && INVITE_CODE_RE.test(code) && code.length <= 120;
}

export async function resolveGuestNameForInviteCode(code: string): Promise<string | null> {
	const guest = await getGuestByInviteCode(code);
	return guest?.full_name ?? null;
}

export async function recordInviteOpen(payload: {
	invite_code: string;
	guest_name?: string | null;
	user_agent?: string | null;
	page_path?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
	const invite_code = normalizeInviteCode(payload.invite_code);
	if (!isValidInviteCode(invite_code)) {
		return { ok: false, error: 'Invalid invite code' };
	}

	try {
		const store = await loadBlobStore();
		if (!store.isValidInviteSlug(invite_code)) {
			return { ok: false, error: 'Invalid invite code' };
		}

		const record = await store.recordInviteOpen(invite_code);
		console.log('[invite-opens] recordInviteOpen:', {
			invite_code,
			open_count: record.openCount,
			page_path: payload.page_path ?? null,
		});
		return { ok: true };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to record invite open';
		console.error('[invite-opens] record failed:', invite_code, message);
		return { ok: false, error: message };
	}
}

function mapBlobRecord(record: BlobInviteOpenRecord): InviteOpenSummary {
	return {
		invite_code: normalizeInviteCode(record.slug),
		guest_name: null,
		first_opened_at: record.firstOpenedAt,
		last_opened_at: record.lastOpenedAt,
		open_count: record.openCount,
	};
}

export async function fetchInviteOpenSummaries(): Promise<InviteOpenSummary[]> {
	const store = await loadBlobStore();
	const records = (await store.getAllInviteOpens()) as BlobInviteOpenRecord[];
	console.log('[invite-opens] loaded blob invite opens:', records.length);
	return records.map(mapBlobRecord);
}

type RsvpResponseRow = {
	invite_code: string | null;
	first_name: string | null;
	last_name: string | null;
	attending: boolean | null;
	total_attending: number | null;
	guest_count: number | null;
	guest_names: unknown;
	guest_names_jsonb?: unknown;
	message: string | null;
	submitted_at: string | null;
	rsvp_source: string | null;
};

function guestNamesFromRow(row: RsvpResponseRow): unknown {
	return row.guest_names_jsonb ?? row.guest_names;
}

function resolveRsvpTotalAttending(
	rsvp: RsvpResponseRow | undefined,
	namesList: string[],
	attending: boolean | null
): number | null {
	if (!rsvp) return null;

	const total = rsvp.total_attending;
	const count = rsvp.guest_count;

	if (typeof total === 'number' && total > 0) return total;
	if (typeof count === 'number' && count > 0) return count;
	if (namesList.length > 0) return namesList.length;
	if (attending === true) return total ?? count ?? 1;
	if (attending === false) return 0;

	return null;
}

/** Latest RSVP per invite_code from rsvp_responses (for future admin dashboard). */
async function fetchLatestRsvpsByInviteCode(): Promise<Map<string, RsvpResponseRow>> {
	const client = createAdminSupabase();
	if (!client) return new Map();

	const { data, error } = await client
		.from('rsvp_responses')
		.select(
			'invite_code, first_name, last_name, attending, total_attending, guest_count, guest_names, guest_names_jsonb, message, submitted_at, rsvp_source'
		)
		.not('invite_code', 'is', null)
		.order('submitted_at', { ascending: false });

	if (error) {
		const missingSource = error.message.includes('rsvp_source');
		if (missingSource) {
			const fallback = await client
				.from('rsvp_responses')
				.select(
					'invite_code, first_name, last_name, attending, total_attending, guest_count, guest_names, guest_names_jsonb, message, submitted_at'
				)
				.not('invite_code', 'is', null)
				.order('submitted_at', { ascending: false });
			if (fallback.error) {
				console.error('[invite-opens] rsvp_responses fetch failed:', fallback.error.message);
				return new Map();
			}
			return buildLatestRsvpMap((fallback.data ?? []) as RsvpResponseRow[]);
		}

		console.error('[invite-opens] rsvp_responses fetch failed:', error.message, error.details ?? '');
		return new Map();
	}

	return buildLatestRsvpMap((data ?? []) as RsvpResponseRow[]);
}

function buildLatestRsvpMap(rows: RsvpResponseRow[]): Map<string, RsvpResponseRow> {
	console.log('[invite-opens] loaded rsvp_responses rows:', rows.length);

	const map = new Map<string, RsvpResponseRow>();
	for (const row of rows) {
		const code = normalizeInviteCode(String(row.invite_code ?? ''));
		if (!code || map.has(code)) continue;
		map.set(code, row);
	}
	return map;
}

/** Fallback when the primary RSVP query returns no rows (e.g. sparse data). */
async function fetchLatestRsvpsByInviteCodeWithFallback(): Promise<Map<string, RsvpResponseRow>> {
	const full = await fetchLatestRsvpsByInviteCode();
	if (full.size > 0) return full;

	const client = createAdminSupabase();
	if (!client) return full;

	const { data, error } = await client
		.from('rsvp_responses')
		.select('invite_code, attending, guest_count, guest_names, guest_names_jsonb, message, submitted_at')
		.not('invite_code', 'is', null)
		.order('submitted_at', { ascending: false });

	if (error) {
		console.error('[invite-opens] rsvp_responses fallback fetch failed:', error.message);
		return full;
	}

	console.log('[invite-opens] loaded rsvp_responses fallback rows:', data?.length ?? 0);
	return buildLatestRsvpMap((data ?? []) as RsvpResponseRow[]);
}

/**
 * Merges guest-list.json + invite_open_summary + latest rsvp_responses per invite code.
 * Intended for /admin/guests when rebuilt to use JSON + Supabase activity tables.
 */
export async function buildGuestActivityReport(): Promise<GuestActivityRow[]> {
	const listEntries = buildGuestListIndex().map((entry) => ({
		invite_code: entry.invite_code,
		guest_name: entry.name,
		max_guests: entry.maxGuests,
	}));

	const [openSummaries, rsvpMap] = await Promise.all([
		fetchInviteOpenSummaries().catch((err) => {
			console.error('[invite-opens] open summary fetch failed:', err);
			return [] as InviteOpenSummary[];
		}),
		fetchLatestRsvpsByInviteCodeWithFallback(),
	]);

	console.log('[invite-opens] activity report merge:', {
		guest_list: listEntries.length,
		open_summaries: openSummaries.length,
		rsvp_codes: rsvpMap.size,
	});

	const openByCode = new Map(openSummaries.map((s) => [normalizeInviteCode(s.invite_code), s]));

	return listEntries
		.map((entry) => {
			const code = normalizeInviteCode(entry.invite_code);
			const opens = openByCode.get(code);
			const rsvp = rsvpMap.get(code);

			const rsvpNamesRaw = rsvp ? guestNamesFromRow(rsvp) : null;
			const rsvpNamesList = parseGuestNames(rsvpNamesRaw);
			const rsvpAttending = rsvp?.attending ?? null;

			return {
				invite_code: code,
				guest_name: entry.guest_name,
				max_guests: entry.max_guests,
				invite_opened: Boolean(opens && opens.open_count > 0),
				first_opened_at: opens?.first_opened_at ?? null,
				last_opened_at: opens?.last_opened_at ?? null,
				open_count: opens?.open_count ?? 0,
				rsvp_submitted: Boolean(rsvp),
				rsvp_attending: rsvpAttending,
				rsvp_total_attending: resolveRsvpTotalAttending(rsvp, rsvpNamesList, rsvpAttending),
				rsvp_guest_names: rsvpNamesList.length ? formatGuestNamesList(rsvpNamesRaw) : null,
				rsvp_guest_names_list: rsvpNamesList,
				rsvp_message: rsvp?.message ?? null,
				rsvp_submitted_at: rsvp?.submitted_at ?? null,
				rsvp_source:
					rsvp?.rsvp_source === 'manual' || rsvp?.rsvp_source === 'guest' ?
						rsvp.rsvp_source
					:	null,
			};
		})
		.sort((a, b) => normalizeName(a.guest_name).localeCompare(normalizeName(b.guest_name)));
}

export function computeGuestActivityStats(rows: GuestActivityRow[]): GuestActivityStats {
	return rows.reduce(
		(acc, row) => {
			acc.total += 1;
			if (row.invite_opened) acc.opened += 1;
			else acc.notOpened += 1;

			if (!row.rsvp_submitted) {
				acc.rsvpPending += 1;
			} else if (row.rsvp_attending) {
				acc.rsvpAttending += 1;
				acc.totalAttending += row.rsvp_total_attending ?? 0;
			} else {
				acc.rsvpDeclined += 1;
			}

			return acc;
		},
		{
			total: 0,
			opened: 0,
			notOpened: 0,
			rsvpAttending: 0,
			rsvpDeclined: 0,
			rsvpPending: 0,
			totalAttending: 0,
		}
	);
}

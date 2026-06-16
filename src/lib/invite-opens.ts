/**
 * Server-side invite open tracking (Supabase invite_opens table).
 * Never import from client scripts — use POST /api/invite-open instead.
 */
import { formatGuestNamesList, parseGuestNames } from './guest-names';
import { createAdminSupabase } from './supabase';
import { getGuestByInviteCode, guestSlug } from './guest-search';
import { loadInvitedGuests, normalizeName } from './rsvp-store';

export type InviteOpenRow = {
	id: string;
	invite_code: string;
	guest_name: string | null;
	opened_at: string;
	user_agent: string | null;
	page_path: string | null;
};

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

	const client = createAdminSupabase();
	if (!client) {
		console.error('[invite-opens] SUPABASE_SERVICE_ROLE_KEY missing — cannot record open');
		return { ok: false, error: 'Invite tracking is not configured' };
	}

	let guest_name = payload.guest_name?.trim() || null;
	if (!guest_name) {
		guest_name = await resolveGuestNameForInviteCode(invite_code);
	}

	console.log('[invite-opens] recordInviteOpen:', {
		invite_code,
		guest_matched: Boolean(guest_name),
		guest_name: guest_name ?? null,
		page_path: payload.page_path ?? null,
	});

	const user_agent = payload.user_agent?.trim().slice(0, 500) || null;
	const page_path = payload.page_path?.trim().slice(0, 500) || null;

	const { error } = await client.from('invite_opens').insert({
		invite_code,
		guest_name,
		user_agent,
		page_path,
	});

	if (error) {
		console.error('[invite-opens] insert failed:', error.message, error.details ?? '', error.hint ?? '');
		return { ok: false, error: error.message };
	}

	console.log('[invite-opens] insert success:', invite_code, guest_name ?? '(unknown guest)');
	return { ok: true };
}

function aggregateInviteOpens(rows: InviteOpenRow[]): InviteOpenSummary[] {
	const byCode = new Map<string, InviteOpenSummary>();

	for (const row of rows) {
		const code = normalizeInviteCode(row.invite_code);
		if (!code) continue;

		const existing = byCode.get(code);
		if (!existing) {
			byCode.set(code, {
				invite_code: code,
				guest_name: row.guest_name,
				first_opened_at: row.opened_at,
				last_opened_at: row.opened_at,
				open_count: 1,
			});
			continue;
		}

		if (row.guest_name && !existing.guest_name) existing.guest_name = row.guest_name;
		if (row.opened_at < existing.first_opened_at) existing.first_opened_at = row.opened_at;
		if (row.opened_at > existing.last_opened_at) existing.last_opened_at = row.opened_at;
		existing.open_count += 1;
	}

	return Array.from(byCode.values()).sort((a, b) =>
		b.last_opened_at.localeCompare(a.last_opened_at)
	);
}

export async function fetchInviteOpenSummaries(): Promise<InviteOpenSummary[]> {
	const client = createAdminSupabase();
	if (!client) {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin invite stats');
	}

	const { data, error } = await client
		.from('invite_open_summary')
		.select('invite_code, guest_name, first_opened_at, last_opened_at, open_count')
		.order('last_opened_at', { ascending: false });

	if (!error) {
		console.log('[invite-opens] loaded invite_open_summary rows:', data?.length ?? 0);
		return (data ?? []) as InviteOpenSummary[];
	}

	console.warn('[invite-opens] invite_open_summary unavailable:', error.message, '— aggregating invite_opens.');

	const { data: rows, error: rowsError } = await client
		.from('invite_opens')
		.select('invite_code, guest_name, opened_at')
		.order('opened_at', { ascending: false });

	if (rowsError) {
		throw new Error(rowsError.message);
	}

	const summaries = aggregateInviteOpens(
		(rows ?? []).map((row) => ({
			id: '',
			invite_code: String(row.invite_code),
			guest_name: row.guest_name != null ? String(row.guest_name) : null,
			opened_at: String(row.opened_at),
			user_agent: null,
			page_path: null,
		}))
	);

	console.log('[invite-opens] aggregated invite_opens rows:', summaries.length);
	return summaries;
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
};

function guestNamesFromRow(row: RsvpResponseRow): unknown {
	return row.guest_names_jsonb ?? row.guest_names;
}

/** Latest RSVP per invite_code from rsvp_responses (for future admin dashboard). */
async function fetchLatestRsvpsByInviteCode(): Promise<Map<string, RsvpResponseRow>> {
	const client = createAdminSupabase();
	if (!client) return new Map();

	const { data, error } = await client
		.from('rsvp_responses')
		.select(
			'invite_code, first_name, last_name, attending, total_attending, guest_count, guest_names, guest_names_jsonb, message, submitted_at'
		)
		.not('invite_code', 'is', null)
		.order('submitted_at', { ascending: false });

	if (error) {
		console.error('[invite-opens] rsvp_responses fetch failed:', error.message, error.details ?? '');
		return new Map();
	}

	const rows = (data ?? []) as RsvpResponseRow[];
	console.log('[invite-opens] loaded rsvp_responses rows:', rows.length);

	const map = new Map<string, RsvpResponseRow>();
	for (const row of rows) {
		const code = normalizeInviteCode(String(row.invite_code ?? ''));
		if (!code || map.has(code)) continue;
		map.set(code, row);
	}
	return map;
}

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
	const map = new Map<string, RsvpResponseRow>();
	for (const row of (data ?? []) as RsvpResponseRow[]) {
		const code = normalizeInviteCode(String(row.invite_code ?? ''));
		if (!code || map.has(code)) continue;
		map.set(code, row);
	}
	return map;
}

/**
 * Merges guest-list.json + invite_open_summary + latest rsvp_responses per invite code.
 * Intended for /admin/guests when rebuilt to use JSON + Supabase activity tables.
 */
export async function buildGuestActivityReport(): Promise<GuestActivityRow[]> {
	const slugCounts = new Map<string, number>();
	const listEntries = loadInvitedGuests().map((guest) => {
		const base = guestSlug(guest.name);
		const n = (slugCounts.get(base) ?? 0) + 1;
		slugCounts.set(base, n);
		const invite_code = n === 1 ? base : `${base}-${n}`;
		return { invite_code, guest_name: guest.name, max_guests: guest.maxGuests };
	});

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

			return {
				invite_code: code,
				guest_name: entry.guest_name,
				max_guests: entry.max_guests,
				invite_opened: Boolean(opens && opens.open_count > 0),
				first_opened_at: opens?.first_opened_at ?? null,
				last_opened_at: opens?.last_opened_at ?? null,
				open_count: opens?.open_count ?? 0,
				rsvp_submitted: Boolean(rsvp),
				rsvp_attending: rsvp?.attending ?? null,
				rsvp_total_attending:
					rsvp?.total_attending ?? rsvp?.guest_count ?? (rsvpNamesList.length || null),
				rsvp_guest_names: rsvpNamesList.length ? formatGuestNamesList(rsvpNamesRaw) : null,
				rsvp_guest_names_list: rsvpNamesList,
				rsvp_message: rsvp?.message ?? null,
				rsvp_submitted_at: rsvp?.submitted_at ?? null,
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

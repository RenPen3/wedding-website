/**
 * Server-side invite open tracking (Supabase invite_opens table).
 * Never import from client scripts — use POST /api/invite-open instead.
 */
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

	const user_agent = payload.user_agent?.trim().slice(0, 500) || null;
	const page_path = payload.page_path?.trim().slice(0, 500) || null;

	const { error } = await client.from('invite_opens').insert({
		invite_code,
		guest_name,
		user_agent,
		page_path,
	});

	if (error) {
		console.error('[invite-opens] insert failed:', error.message);
		return { ok: false, error: error.message };
	}

	console.log('[invite-opens] recorded open:', invite_code, guest_name ?? '(unknown guest)');
	return { ok: true };
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

	if (error) {
		throw new Error(error.message);
	}

	return (data ?? []) as InviteOpenSummary[];
}

type RsvpResponseRow = {
	invite_code: string | null;
	first_name: string | null;
	last_name: string | null;
	attending: boolean | null;
	total_attending: number | null;
	guest_count: number | null;
	guest_names: string | null;
	message: string | null;
	submitted_at: string | null;
};

/** Latest RSVP per invite_code from rsvp_responses (for future admin dashboard). */
async function fetchLatestRsvpsByInviteCode(): Promise<Map<string, RsvpResponseRow>> {
	const client = createAdminSupabase();
	if (!client) return new Map();

	const { data, error } = await client
		.from('rsvp_responses')
		.select(
			'invite_code, first_name, last_name, attending, total_attending, guest_count, guest_names, message, submitted_at'
		)
		.not('invite_code', 'is', null)
		.order('submitted_at', { ascending: false });

	if (error) {
		console.error('[invite-opens] rsvp_responses fetch failed:', error.message);
		return new Map();
	}

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
		fetchInviteOpenSummaries().catch(() => [] as InviteOpenSummary[]),
		fetchLatestRsvpsByInviteCode(),
	]);

	const openByCode = new Map(openSummaries.map((s) => [normalizeInviteCode(s.invite_code), s]));

	return listEntries
		.map((entry) => {
			const code = normalizeInviteCode(entry.invite_code);
			const opens = openByCode.get(code);
			const rsvp = rsvpMap.get(code);

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
					rsvp?.total_attending ?? rsvp?.guest_count ?? null,
				rsvp_guest_names: rsvp?.guest_names ?? null,
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

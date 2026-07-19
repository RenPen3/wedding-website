import { getSiteUrl } from './site-urls';

/** Query param used on homepage and RSVP URLs for personal invite links. */
export const INVITE_CODE_PARAM = 'invite_code';

/** Read invite code from URL search params (supports legacy `code` / `invite`). */
export function readInviteCodeFromSearchParams(params: URLSearchParams): string {
	const raw =
		params.get(INVITE_CODE_PARAM)?.trim() ||
		params.get('code')?.trim() ||
		params.get('invite')?.trim() ||
		'';
	return raw.toLowerCase();
}

/** Personal invite link — lands on the wedding homepage with preloader. */
export function buildInviteHomeUrl(inviteCode: string, requestOrigin?: string): string {
	const base = getSiteUrl(requestOrigin) || '';
	const code = inviteCode.trim();
	if (!code) return `${base}/`;
	const qs = new URLSearchParams({ [INVITE_CODE_PARAM]: code });
	return `${base}/?${qs.toString()}`;
}

/** RSVP page URL, preserving the invite identifier. */
export function buildRsvpUrl(inviteCode?: string, requestOrigin?: string): string {
	const base = `${getSiteUrl(requestOrigin) || ''}/rsvp`;
	const code = inviteCode?.trim();
	if (!code) return base;
	const qs = new URLSearchParams({ [INVITE_CODE_PARAM]: code });
	return `${base}?${qs.toString()}`;
}

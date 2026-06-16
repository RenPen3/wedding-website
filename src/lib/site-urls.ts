export const REGISTRY_URL = 'https://www.zola.com/registry/jocelynandrene';
export const HONEYMOON_FUND_URL = '/honeymoon-fund';

/** Guest contact — update with your real email and phone */
export const CONTACT_EMAIL = 'jocelynandrene0912@gmail.com';
export const CONTACT_PHONE_TEL = '+18185682932';

function stripTrailingSlash(url: string): string {
	return url.replace(/\/+$/, '');
}

/**
 * Site base URL for invite/RSVP/admin links (no trailing slash).
 * 1. PUBLIC_SITE_URL env
 * 2. Local dev → http://localhost:4321
 * 3. Production → current request origin (e.g. Astro.url.origin)
 */
export function getSiteUrl(requestOrigin?: string): string {
	const fromEnv = import.meta.env.PUBLIC_SITE_URL?.trim();
	if (fromEnv) return stripTrailingSlash(fromEnv);
	if (import.meta.env.DEV) return 'http://localhost:4321';
	if (requestOrigin?.trim()) return stripTrailingSlash(requestOrigin.trim());
	return '';
}

export function getInviteUrl(inviteCode: string, requestOrigin?: string): string {
	const code = inviteCode.trim();
	return `${getSiteUrl(requestOrigin)}/invite/${encodeURIComponent(code)}`;
}

export function getRsvpUrl(inviteCode?: string, requestOrigin?: string): string {
	const base = `${getSiteUrl(requestOrigin)}/rsvp`;
	if (!inviteCode?.trim()) return base;
	return `${base}?code=${encodeURIComponent(inviteCode.trim())}`;
}

export function getAdminGuestsUrl(requestOrigin?: string): string {
	return `${getSiteUrl(requestOrigin)}/admin/guests`;
}

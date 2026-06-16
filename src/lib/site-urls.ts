/** Canonical site base URL (no trailing slash). */
const PRODUCTION_SITE_URL = 'https://jocelynandrene.netlify.app';

export const REGISTRY_URL = 'https://www.zola.com/registry/jocelynandrene/edit';

/** Resolves PUBLIC_SITE_URL, with sensible dev/prod fallbacks when unset. */
export function getSiteUrl(): string {
	const fromEnv = import.meta.env.PUBLIC_SITE_URL?.trim();
	if (fromEnv) return fromEnv.replace(/\/+$/, '');
	if (import.meta.env.DEV) return 'http://localhost:4321';
	return PRODUCTION_SITE_URL;
}

export function getInviteUrl(inviteCode: string): string {
	const code = inviteCode.trim();
	return `${getSiteUrl()}/invite/${encodeURIComponent(code)}`;
}

export function getRsvpUrl(inviteCode?: string): string {
	const base = `${getSiteUrl()}/rsvp`;
	if (!inviteCode?.trim()) return base;
	return `${base}?code=${encodeURIComponent(inviteCode.trim())}`;
}

export function getAdminGuestsUrl(): string {
	return `${getSiteUrl()}/admin/guests`;
}

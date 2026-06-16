<<<<<<< HEAD
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
=======
export const REGISTRY_URL = 'https://www.zola.com/registry/jocelynandrene';
export const HONEYMOON_FUND_URL = '/honeymoon-fund';

/** Guest contact — update with your real email and phone */
export const CONTACT_EMAIL = 'jocelynandrene0912@gmail.com';
export const CONTACT_PHONE_TEL = '+18185682932';
>>>>>>> e11e03306ab155911117bf83d9eca504d55491f3

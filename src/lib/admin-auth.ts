import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'wedding_admin_session';

export function getAdminPassword(): string {
	return import.meta.env.ADMIN_PASSWORD ?? 'dev-admin-password';
}

export function signAdminSession(): string {
	return createHmac('sha256', getAdminPassword()).update('wedding-admin-v1').digest('hex');
}

export function isValidAdminSession(cookieValue: string | undefined): boolean {
	if (!cookieValue) return false;
	const expected = signAdminSession();
	try {
		const a = Buffer.from(cookieValue, 'utf8');
		const b = Buffer.from(expected, 'utf8');
		if (a.length !== b.length) return false;
		return timingSafeEqual(a, b);
	} catch {
		return false;
	}
}

export function verifyAdminPassword(password: string): boolean {
	const expected = getAdminPassword();
	try {
		const a = Buffer.from(password, 'utf8');
		const b = Buffer.from(expected, 'utf8');
		if (a.length !== b.length) return false;
		return timingSafeEqual(a, b);
	} catch {
		return false;
	}
}

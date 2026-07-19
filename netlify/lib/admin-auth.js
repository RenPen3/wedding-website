import { createHmac, timingSafeEqual } from 'node:crypto';

export function getAdminPassword() {
	return process.env.ADMIN_PASSWORD ?? 'dev-admin-password';
}

export function signAdminSession() {
	return createHmac('sha256', getAdminPassword()).update('wedding-admin-v1').digest('hex');
}

/**
 * @param {string | undefined | null} token
 */
export function isValidAdminSession(token) {
	if (!token) return false;
	const expected = signAdminSession();
	try {
		const a = Buffer.from(token, 'utf8');
		const b = Buffer.from(expected, 'utf8');
		if (a.length !== b.length) return false;
		return timingSafeEqual(a, b);
	} catch {
		return false;
	}
}

/**
 * @param {Request} request
 */
export function getBearerToken(request) {
	const header = request.headers.get('authorization');
	if (!header?.startsWith('Bearer ')) return undefined;
	return header.slice(7).trim();
}

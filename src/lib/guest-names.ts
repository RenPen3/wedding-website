/** Parse guest_names from Supabase (jsonb array, JSON text, or comma-separated text). */
export function parseGuestNames(raw: unknown): string[] {
	if (raw == null) return [];
	if (Array.isArray(raw)) {
		return raw.map((n) => String(n).trim()).filter(Boolean);
	}
	if (typeof raw === 'string') {
		const trimmed = raw.trim();
		if (!trimmed) return [];
		if (trimmed.startsWith('[')) {
			try {
				const parsed = JSON.parse(trimmed) as unknown;
				if (Array.isArray(parsed)) {
					return parsed.map((n) => String(n).trim()).filter(Boolean);
				}
			} catch {
				/* fall through to comma split */
			}
		}
		return trimmed
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return [];
}

/** Non-blank attending names exactly as entered on the RSVP form. */
export function allAttendingGuestNames(allNames: string[]): string[] {
	return allNames.map((n) => n.trim()).filter(Boolean);
}

export function formatGuestNamesList(raw: unknown): string {
	return parseGuestNames(raw).join(', ');
}

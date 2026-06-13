import type { APIRoute } from 'astro';
import { searchGuests } from '../../lib/guest-search';

export const GET: APIRoute = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';

	if (q.trim().length < 2) {
		return new Response(JSON.stringify({ ok: true, guests: [] }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const guests = await searchGuests(q);
		console.log('[api/guest-search] query:', q.trim(), 'matches:', guests.length);
		return new Response(JSON.stringify({ ok: true, guests }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Guest search failed';
		console.error('[api/guest-search]', message);
		return new Response(JSON.stringify({ ok: false, error: 'Could not search guest list. Please try again.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

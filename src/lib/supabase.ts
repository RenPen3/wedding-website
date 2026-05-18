import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../db/supabase.js';

function resolveSupabaseUrl(): string | undefined {
	return import.meta.env.SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;
}

function resolveSupabaseKey(): string | undefined {
	return import.meta.env.SUPABASE_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
}

/** Shared public client (anon / publishable key). */
export function createPublicSupabase(): SupabaseClient {
	return supabase;
}

/** Server-only admin client — bypasses RLS. Never import from client-side scripts. */
export function createAdminSupabase(): SupabaseClient | null {
	const url = resolveSupabaseUrl();
	const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !serviceKey) return null;
	return createClient(url, serviceKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}

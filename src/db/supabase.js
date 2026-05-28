import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
	import.meta.env.SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey =
	import.meta.env.SUPABASE_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_KEY in .env.local (see .env.example).'
	);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: { persistSession: false, autoRefreshToken: false },
});
Í
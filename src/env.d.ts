/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly SUPABASE_URL: string;
	readonly SUPABASE_KEY: string;
	readonly PUBLIC_SUPABASE_URL: string;
	readonly PUBLIC_SUPABASE_ANON_KEY: string;
	readonly ADMIN_PASSWORD?: string;
	/** Server-only — used for admin dashboard (never expose to the browser). */
	readonly SUPABASE_SERVICE_ROLE_KEY?: string;
	/** Optional — enables OpenAI vision for AI Slideshow Builder */
	readonly OPENAI_API_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

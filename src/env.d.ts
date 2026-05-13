/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly ADMIN_SECRET?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

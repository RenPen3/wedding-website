// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	adapter: netlify({
		// Seed file for first-run blob init and local file fallback
		includeFiles: ['src/data/wedding-state.json'],
	}),
	vite: {
		plugins: [tailwindcss()],
	},
});

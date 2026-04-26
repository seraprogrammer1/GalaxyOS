import { sveltekit } from '@sveltejs/kit/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const testing = !!process.env.VITEST;

export default defineConfig({
	plugins: testing ? [svelte()] : [sveltekit()],
	resolve: {
		conditions: testing ? ['browser'] : [],
		alias: testing
			? {
					$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
					'$app/stores': fileURLToPath(new URL('./src/test-utils/app-stores.ts', import.meta.url)),
					'$env/dynamic/private': fileURLToPath(new URL('./src/test-utils/env-private.ts', import.meta.url))
				}
			: {}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		globals: true,
		setupFiles: ['./src/setupStories.ts']
	}
});

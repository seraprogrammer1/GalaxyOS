import { readable } from 'svelte/store';

// Minimal test shim for SvelteKit's $app/stores page store.
export const page = readable({
	url: new URL('http://localhost/dashboard')
});

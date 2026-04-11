import { writable } from 'svelte/store';

export type Theme = 'light-cosmic' | 'dark';

function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>('light-cosmic');

	return {
		subscribe,
		set,
		toggle: () => update((t) => (t === 'light-cosmic' ? 'dark' : 'light-cosmic'))
	};
}

export const themeStore = createThemeStore();

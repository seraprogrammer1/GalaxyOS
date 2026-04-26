import { writable } from 'svelte/store';
import { THEMES, THEME_IDS, type ThemeId } from '$lib/themes';

export type { ThemeId };

function applyTheme(id: ThemeId) {
	if (typeof window === 'undefined') return;
	const el = document.querySelector('.app-shell') as HTMLElement | null;
	if (!el) return;
	const def = THEMES[id] ?? THEMES['light-cosmic'];
	el.setAttribute('data-theme', def.mode);
	for (const [key, value] of Object.entries(def.vars)) {
		el.style.setProperty(key, value);
	}
}

function createThemeStore() {
	const { subscribe, set: _set, update } = writable<ThemeId>('light-cosmic');

	function set(id: ThemeId) {
		_set(id);
		applyTheme(id);
		if (typeof window !== 'undefined') {
			window.localStorage.setItem('galaxyos-theme', id);
		}
	}

	return {
		subscribe,
		set,
		apply: applyTheme,
		toggle: () =>
			update((t) => {
				const next = t === 'light-cosmic' ? 'dark' : 'light-cosmic';
				set(next);
				return next;
			})
	};
}

export { THEME_IDS };
export const themeStore = createThemeStore();

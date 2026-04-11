import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { themeStore } from './stores/theme';

describe('themeStore', () => {
	beforeEach(() => {
		themeStore.set('light-cosmic');
	});

	it('should default to "light-cosmic"', () => {
		expect(get(themeStore)).toBe('light-cosmic');
	});

	it('should toggle from "light-cosmic" to "dark"', () => {
		themeStore.toggle();
		expect(get(themeStore)).toBe('dark');
	});

	it('should toggle from "dark" back to "light-cosmic"', () => {
		themeStore.set('dark');
		themeStore.toggle();
		expect(get(themeStore)).toBe('light-cosmic');
	});

	it('should allow direct set to a specific theme', () => {
		themeStore.set('dark');
		expect(get(themeStore)).toBe('dark');
	});
});

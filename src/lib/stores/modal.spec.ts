import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { modalStore } from './modal';

// Plain objects used as stand-ins for component references
const MockComponent = {} as never;
const AnotherComponent = {} as never;

describe('modalStore', () => {
	beforeEach(() => {
		modalStore.close();
	});

	it('should start with no active modal (null)', () => {
		expect(get(modalStore)).toBeNull();
	});

	it('should set the component and props when open() is called', () => {
		modalStore.open(MockComponent, { title: 'Hello' });
		const state = get(modalStore);
		expect(state).not.toBeNull();
		expect(state?.component).toBe(MockComponent);
		expect(state?.props).toEqual({ title: 'Hello' });
	});

	it('should default props to an empty object when none are provided', () => {
		modalStore.open(MockComponent);
		expect(get(modalStore)?.props).toEqual({});
	});

	it('should clear the modal when close() is called', () => {
		modalStore.open(MockComponent, { x: 1 });
		modalStore.close();
		expect(get(modalStore)).toBeNull();
	});

	it('should replace the active modal when open() is called again', () => {
		modalStore.open(MockComponent, { a: 1 });
		modalStore.open(AnotherComponent, { b: 2 });
		const state = get(modalStore);
		expect(state?.component).toBe(AnotherComponent);
		expect(state?.props).toEqual({ b: 2 });
	});
});

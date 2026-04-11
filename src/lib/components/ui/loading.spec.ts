/* @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import LoadingSpinner from './LoadingSpinner.svelte';
import SkeletonLoader from './SkeletonLoader.svelte';

describe('LoadingSpinner', () => {
	it('renders a spinner element', () => {
		const { container } = render(LoadingSpinner);
		expect(container.querySelector('.spinner')).not.toBeNull();
	});

	it('accepts a size prop without error', () => {
		const { container } = render(LoadingSpinner, { props: { size: 48 } });
		expect(container.querySelector('.spinner')).not.toBeNull();
	});

	it('has an accessible status role', () => {
		const { getByRole } = render(LoadingSpinner);
		expect(getByRole('status')).toBeTruthy();
	});
});

describe('SkeletonLoader', () => {
	it('renders a skeleton element', () => {
		const { container } = render(SkeletonLoader);
		expect(container.querySelector('.skeleton')).not.toBeNull();
	});

	it('accepts width and height props without error', () => {
		const { container } = render(SkeletonLoader, { props: { width: '200px', height: '20px' } });
		expect(container.querySelector('.skeleton')).not.toBeNull();
	});

	it('applies rounded class when rounded prop is true', () => {
		const { container } = render(SkeletonLoader, { props: { rounded: true } });
		const el = container.querySelector('.skeleton') as HTMLElement;
		expect(el.classList.contains('rounded')).toBe(true);
	});
});

/* @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import AppLayout from './(app)/+layout.svelte';

describe('(app) layout shell', () => {
	it('renders a <header> element', () => {
		const { container } = render(AppLayout);
		expect(container.querySelector('header')).not.toBeNull();
	});

	it('renders the Galaxy OS title', () => {
		const { getByText } = render(AppLayout);
		expect(getByText(/Galaxy OS/i)).toBeTruthy();
	});

	it('renders a logout button', () => {
		const { getByRole } = render(AppLayout);
		expect(getByRole('button', { name: /logout/i })).toBeTruthy();
	});

	it('renders the modal host container', () => {
		const { container } = render(AppLayout);
		expect(container.querySelector('[data-modal-host]')).not.toBeNull();
	});
});

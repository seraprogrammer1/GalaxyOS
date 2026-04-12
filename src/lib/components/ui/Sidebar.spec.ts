/* @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { composeStories } from '@storybook/svelte';
import * as stories from './Sidebar.stories';

const { DashboardActive, SettingsActive } = composeStories(stories);

describe('Sidebar (portable stories)', () => {
	it('renders all required navigation links', () => {
		const { container } = render(DashboardActive.Component, { props: DashboardActive.props });
		expect(container.querySelector('a[href="/dashboard"]')).not.toBeNull();
		expect(container.querySelector('a[href="/chat"]')).not.toBeNull();
		expect(container.querySelector('a[href="/naca"]')).not.toBeNull();
		expect(container.querySelector('a[href="/settings"]')).not.toBeNull();
	});

	it('marks dashboard link as active when currentPath is /dashboard', () => {
		const { container } = render(DashboardActive.Component, { props: DashboardActive.props });
		const active = container.querySelector('a[href="/dashboard"]');
		expect(active?.classList.contains('is-active')).toBe(true);
	});

	it('marks settings link as active when currentPath is /settings', () => {
		const { container } = render(SettingsActive.Component, { props: SettingsActive.props });
		const active = container.querySelector('a[href="/settings"]');
		expect(active?.classList.contains('is-active')).toBe(true);
	});
});

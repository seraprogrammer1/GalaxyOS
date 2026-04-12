/* @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { composeStories } from '@storybook/svelte';
import * as stories from './Header.stories';

const { Default } = composeStories(stories);

describe('Header (portable stories)', () => {
	it('renders a session greeting with username', () => {
		const { getByText } = render(Default.Component, { props: Default.props });
		expect(getByText('Hello, testuser')).toBeTruthy();
	});

	it('renders the active page title', () => {
		const { getByText } = render(Default.Component, { props: Default.props });
		expect(getByText('Dashboard')).toBeTruthy();
	});

	it('does not render sidebar navigation links in header', () => {
		const { container } = render(Default.Component, { props: Default.props });
		const settingsLink = container.querySelector('a[href="/settings"]');
		const chatLink = container.querySelector('a[href="/chat"]');
		expect(settingsLink).toBeNull();
		expect(chatLink).toBeNull();
	});

	it('shows a notification badge', () => {
		const { getByText } = render(Default.Component, { props: Default.props });
		expect(getByText('3 New')).toBeTruthy();
	});

	it('renders a logout button', () => {
		const { getByRole } = render(Default.Component, { props: Default.props });
		expect(getByRole('button', { name: /logout/i })).toBeTruthy();
	});
});

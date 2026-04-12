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

	it('renders the Galaxy OS title', () => {
		const { getByText } = render(Default.Component, { props: Default.props });
		expect(getByText('Galaxy OS')).toBeTruthy();
	});

	it('contains a link to /settings', () => {
		const { container } = render(Default.Component, { props: Default.props });
		const settingsLink = container.querySelector('a[href="/settings"]');
		expect(settingsLink).not.toBeNull();
	});

	it('contains a link to /chat', () => {
		const { container } = render(Default.Component, { props: Default.props });
		const chatLink = container.querySelector('a[href="/chat"]');
		expect(chatLink).not.toBeNull();
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

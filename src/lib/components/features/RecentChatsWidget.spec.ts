/* @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { composeStories } from '@storybook/svelte';
import * as stories from './RecentChatsWidget.stories';

const { Default, Empty, AllUnread } = composeStories(stories);

describe('RecentChatsWidget (portable stories)', () => {
	it('renders the "Recent Chats" heading', () => {
		const { getByRole } = render(Default.Component, { props: Default.props });
		expect(getByRole('heading', { name: 'Recent Chats' })).toBeTruthy();
	});

	it('renders three default chat threads', () => {
		const { getAllByTestId } = render(Default.Component, { props: Default.props });
		expect(getAllByTestId('chat-thread')).toHaveLength(3);
	});

	it('renders chat thread names', () => {
		const { getByText } = render(Default.Component, { props: Default.props });
		expect(getByText('System Prompt Assistant')).toBeTruthy();
		expect(getByText('Zillow Scraper Bot')).toBeTruthy();
		expect(getByText('Code Review Agent')).toBeTruthy();
	});

	it('shows empty state when no threads', () => {
		const { getByText } = render(Empty.Component, { props: Empty.props });
		expect(getByText('No chats yet.')).toBeTruthy();
	});

	it('shows unread badges on threads with unread messages', () => {
		const { container } = render(AllUnread.Component, { props: AllUnread.props });
		const badges = container.querySelectorAll('.unread-badge');
		expect(badges.length).toBe(3);
	});

	it('contains a "View All" link to /chat', () => {
		const { getByText } = render(Default.Component, { props: Default.props });
		const link = getByText('View All') as HTMLAnchorElement;
		expect(link.getAttribute('href')).toBe('/chat');
	});
});

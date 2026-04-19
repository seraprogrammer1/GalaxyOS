import type { Meta, StoryObj } from '@storybook/svelte';
import RecentChatsWidget from './RecentChatsWidget.svelte';
import StoryViewport from './StoryViewport.svelte';

const meta: Meta<typeof RecentChatsWidget> = {
	title: 'Features/RecentChatsWidget',
	component: RecentChatsWidget
};

export default meta;

type Story = StoryObj<typeof RecentChatsWidget>;

const MANY_THREADS = Array.from({ length: 18 }, (_, i) => ({
	id: `thread-${i + 1}`,
	name: `Assistant Thread ${i + 1}`,
	lastMessage: `Update ${i + 1}: system reports healthy services and queue updates.`,
	time: `${i + 1}m ago`,
	unread: i % 3 === 0 ? 2 : 0
}));

/** Default — three mock chat threads. */
export const Default: Story = {
	args: {
		threads: [
			{
				id: '1',
				name: 'System Prompt Assistant',
				lastMessage: 'Your prompt has been optimized.',
				time: '2m ago',
				unread: 0
			},
			{
				id: '2',
				name: 'Zillow Scraper Bot',
				lastMessage: 'Found 14 new listings in Austin.',
				time: '15m ago',
				unread: 0
			},
			{
				id: '3',
				name: 'Code Review Agent',
				lastMessage: 'PR #42 looks good to merge.',
				time: '1h ago',
				unread: 0
			}
		]
	}
};

/** Empty — no conversations yet. */
export const Empty: Story = {
	args: {
		threads: []
	}
};

/** All unread — every thread has unread messages. */
export const AllUnread: Story = {
	args: {
		threads: [
			{
				id: '1',
				name: 'System Prompt Assistant',
				lastMessage: 'Your prompt has been optimized.',
				time: '2m ago',
				unread: 5
			},
			{
				id: '2',
				name: 'Zillow Scraper Bot',
				lastMessage: 'Found 14 new listings in Austin.',
				time: '15m ago',
				unread: 3
			},
			{
				id: '3',
				name: 'Code Review Agent',
				lastMessage: 'PR #42 looks good to merge.',
				time: '1h ago',
				unread: 1
			}
		]
	}
};

/** Overflow state — fixed-height viewport proving internal list scrolling and sticky header. */
export const OverflowScrollable: Story = {
	render: () => ({
		Component: StoryViewport,
		props: {
			Component: RecentChatsWidget,
			componentProps: {
				threads: MANY_THREADS
			}
		}
	})
};

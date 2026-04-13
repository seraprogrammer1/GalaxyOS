import type { Meta, StoryObj } from '@storybook/svelte';
import MessageFeed from './MessageFeed.svelte';

const mockMessages = [
	{ role: 'user', content: 'Hello AI, what can you help me with tonight?' },
	{ role: 'assistant', content: 'I can help you plan goals, budget updates, and coding tasks.' },
	{ role: 'user', content: 'Great, summarize my priorities in one list.' },
	{ role: 'assistant', content: '1) Finish API endpoints. 2) Run tests. 3) Prepare deployment notes.' },
	{ role: 'user', content: 'Now make that list feel calm and focused.' }
] as const;

const meta: Meta<typeof MessageFeed> = {
	title: 'Features/Chat/MessageFeed',
	component: MessageFeed
};

export default meta;

type Story = StoryObj<typeof MessageFeed>;

export const AlternatingConversation: Story = {
	args: {
		messages: mockMessages
	}
};

export const WithTypingState: Story = {
	args: {
		messages: mockMessages,
		showTyping: true
	}
};
import type { Meta, StoryObj } from '@storybook/svelte';
import Header from './Header.svelte';

const meta: Meta<typeof Header> = {
	title: 'UI/Header',
	component: Header
};

export default meta;

type Story = StoryObj<typeof Header>;

/** Default header with navigation links and notification badge. */
export const Default: Story = {
	args: {
		username: 'testuser',
		currentPath: '/dashboard'
	}
};

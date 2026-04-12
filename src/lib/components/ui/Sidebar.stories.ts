import type { Meta, StoryObj } from '@storybook/svelte';
import Sidebar from './Sidebar.svelte';

const meta: Meta<typeof Sidebar> = {
	title: 'UI/Sidebar',
	component: Sidebar
};

export default meta;

type Story = StoryObj<typeof Sidebar>;

export const DashboardActive: Story = {
	args: {
		currentPath: '/dashboard',
		username: 'testuser'
	}
};

export const SettingsActive: Story = {
	args: {
		currentPath: '/settings',
		username: 'testuser'
	}
};

/**
 * Stories for the ConfirmModal component.
 *
 * This file acts as the TDD compilation test for ConfirmModal.svelte.
 * The Storybook build will fail until ConfirmModal.svelte exists and
 * exports the expected props.
 *
 * Run with:  npm run storybook
 */
import type { Meta, StoryObj } from '@storybook/svelte';
import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';

const meta: Meta<typeof ConfirmModal> = {
	title: 'UI/ConfirmModal',
	component: ConfirmModal
};

export default meta;

type Story = StoryObj<typeof ConfirmModal>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default confirmation dialog — no checkbox. */
export const Default: Story = {
	args: {
		title: 'Are you sure?',
		message: 'This action cannot be undone.',
		showCheckbox: false,
		onConfirm: () => alert('Confirmed'),
		onCancel: () => alert('Cancelled')
	}
};

/** With "Don't ask me again" checkbox shown. */
export const WithDontAskAgain: Story = {
	args: {
		title: 'Delete Goal',
		message: 'Delete "Run a 5K"? This cannot be undone.',
		showCheckbox: true,
		onConfirm: (dontAskAgain: boolean) => alert(`Confirmed (dontAskAgain=${dontAskAgain})`),
		onCancel: () => alert('Cancelled')
	}
};

/** Destructive variant — styled for a danger action. */
export const Destructive: Story = {
	args: {
		title: 'Delete Account',
		message: 'All your data will be permanently removed.',
		showCheckbox: false,
		onConfirm: () => {},
		onCancel: () => {}
	}
};

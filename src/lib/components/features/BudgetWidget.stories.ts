import type { Meta, StoryObj } from '@storybook/svelte';
import BudgetWidget from './BudgetWidget.svelte';

const meta: Meta<typeof BudgetWidget> = {
	title: 'Features/BudgetWidget',
	component: BudgetWidget
};

export default meta;

type Story = StoryObj<typeof BudgetWidget>;

/** Default — shows a typical monthly budget with remaining balance and daily allowance. */
export const Default: Story = {};

/** High spend — budget nearly exhausted. */
export const HighSpend: Story = {
	args: {
		budget: { remaining: '$120', total: 6000, spent: 5880, dailyAllowance: '$10' }
	}
};

/** Fresh budget — nothing spent yet. */
export const Fresh: Story = {
	args: {
		budget: { remaining: '$6,000', total: 6000, spent: 0, dailyAllowance: '$200' }
	}
};

import type { Meta, StoryObj } from '@storybook/svelte';
import BudgetWidget from './BudgetWidget.svelte';

const meta: Meta<typeof BudgetWidget> = {
	title: 'Features/BudgetWidget',
	component: BudgetWidget
};

export default meta;

type Story = StoryObj<typeof BudgetWidget>;

/** Default — shows a typical monthly budget with remaining balance and daily allowance. */
export const Default: Story = {
	args: {
		budget: { remaining: '$4,520', total: 6000, spent: 1480, income: 7500, dailyAllowance: '$150' }
	}
};

/** High spend — budget nearly exhausted. */
export const HighSpend: Story = {
	args: {
		budget: { remaining: '$120', total: 6000, spent: 5880, income: 7350, dailyAllowance: '$10' }
	}
};

/** Fresh budget — nothing spent yet. */
export const Fresh: Story = {
	args: {
		budget: { remaining: '$6,000', total: 6000, spent: 0, income: 7500, dailyAllowance: '$200' }
	}
};

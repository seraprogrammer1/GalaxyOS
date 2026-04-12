import type { Meta, StoryObj } from '@storybook/svelte';
import NacaWidget from './NacaWidget.svelte';

const meta: Meta<typeof NacaWidget> = {
	title: 'Features/NacaWidget',
	component: NacaWidget
};

export default meta;

type Story = StoryObj<typeof NacaWidget>;

/** Default — standard NACA summary with 4 data points. */
export const Default: Story = {};

/** High-value home — larger purchase scenario. */
export const HighValue: Story = {
	args: {
		naca: {
			homePrice: '$450,000',
			monthlyTI: '$520',
			buyDown: '3 points',
			totalFunds: '$18,900'
		}
	}
};

/** Starter home — lower-range entry scenario. */
export const StarterHome: Story = {
	args: {
		naca: {
			homePrice: '$150,000',
			monthlyTI: '$210',
			buyDown: '7 points',
			totalFunds: '$8,200'
		}
	}
};

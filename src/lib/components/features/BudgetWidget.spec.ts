/* @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { composeStories } from '@storybook/svelte';
import * as stories from './BudgetWidget.stories';

const { Default, HighSpend, Fresh } = composeStories(stories);

describe('BudgetWidget (portable stories)', () => {
	it('renders the "Budget" heading', () => {
		const { getByRole } = render(Default.Component, { props: Default.props });
		expect(getByRole('heading', { name: 'Budget' })).toBeTruthy();
	});

	it('renders the Monthly Budget metric', () => {
		const { getByText } = render(Default.Component, { props: Default.props });
		expect(getByText('Monthly Budget')).toBeTruthy();
		expect(getByText('$4,520')).toBeTruthy();
	});

	it('renders the Daily Allowance metric', () => {
		const { getByText } = render(Default.Component, { props: Default.props });
		expect(getByText('Daily Allowance')).toBeTruthy();
		expect(getByText('$150')).toBeTruthy();
	});

	it('renders spent and total amounts', () => {
		const { getByText } = render(Default.Component, { props: Default.props });
		expect(getByText('$1,480 spent')).toBeTruthy();
		expect(getByText('$6,000 total')).toBeTruthy();
	});

	it('shows a progress bar', () => {
		const { getByRole } = render(Default.Component, { props: Default.props });
		const bar = getByRole('progressbar');
		expect(bar).toBeTruthy();
	});

	it('renders high-spend story correctly', () => {
		const { getByText } = render(HighSpend.Component, { props: HighSpend.props });
		expect(getByText('$120')).toBeTruthy();
		expect(getByText('$10')).toBeTruthy();
	});

	it('renders fresh-budget story correctly', () => {
		const { getByText } = render(Fresh.Component, { props: Fresh.props });
		expect(getByText('$6,000')).toBeTruthy();
		expect(getByText('$200')).toBeTruthy();
	});
});

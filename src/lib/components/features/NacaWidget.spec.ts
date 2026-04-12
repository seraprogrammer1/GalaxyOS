/* @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { composeStories } from '@storybook/svelte';
import * as stories from './NacaWidget.stories';

const { Default, HighValue, StarterHome } = composeStories(stories);

describe('NacaWidget (portable stories)', () => {
	it('renders the "NACA Summary" heading', () => {
		const { getByRole } = render(Default.Component, { props: Default.props });
		expect(getByRole('heading', { name: 'NACA Summary' })).toBeTruthy();
	});

	it('renders all 4 default metric labels', () => {
		const { getByText } = render(Default.Component, { props: Default.props });
		expect(getByText('Home Price')).toBeTruthy();
		expect(getByText('Monthly TI')).toBeTruthy();
		expect(getByText('Buy Down')).toBeTruthy();
		expect(getByText('Total Funds')).toBeTruthy();
	});

	it('renders default metric values', () => {
		const { getByText } = render(Default.Component, { props: Default.props });
		expect(getByText('$250,000')).toBeTruthy();
		expect(getByText('$350')).toBeTruthy();
		expect(getByText('5 points')).toBeTruthy();
		expect(getByText('$12,500')).toBeTruthy();
	});

	it('renders the "Open Calculator" button', () => {
		const { getByRole } = render(Default.Component, { props: Default.props });
		expect(getByRole('button', { name: 'Open Calculator' })).toBeTruthy();
	});

	it('renders high-value story correctly', () => {
		const { getByText } = render(HighValue.Component, { props: HighValue.props });
		expect(getByText('$450,000')).toBeTruthy();
		expect(getByText('$18,900')).toBeTruthy();
	});

	it('renders starter-home story correctly', () => {
		const { getByText } = render(StarterHome.Component, { props: StarterHome.props });
		expect(getByText('$150,000')).toBeTruthy();
		expect(getByText('$8,200')).toBeTruthy();
	});
});

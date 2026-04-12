/**
 * Stories for the Goals feature widget.
 *
 * Each story supplies MSW handlers via the `parameters.msw` key so that the
 * <Goals /> component makes real fetch calls that are intercepted offline —
 * no backend required.
 *
 * Run with:  npm run storybook
 */
import type { Meta, StoryObj } from '@storybook/svelte';
import { http, HttpResponse } from 'msw';
import Goals from './Goals.svelte';

// ---------------------------------------------------------------------------
// Fixtures (derived from the shared mock data to stay in sync)
// ---------------------------------------------------------------------------
const STORY_GOALS = [
	{
		_id: 'story-1',
		title: 'Read 12 Books',
		note: 'Focus on non-fiction this year',
		category: 'Learning',
		completed: false,
		target_value: 12,
		current_value: 3
	},
	{
		_id: 'story-2',
		title: 'Run a 5K',
		note: '',
		category: 'Fitness',
		completed: false,
		target_value: 1,
		current_value: 0
	},
	{
		_id: 'story-3',
		title: 'Ship Galaxy OS v1.0',
		note: "We're almost there!",
		category: 'Career',
		completed: true,
		target_value: 1,
		current_value: 1
	}
];

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------
const meta: Meta<typeof Goals> = {
	title: 'Features/Goals',
	component: Goals
};

export default meta;

type Story = StoryObj<typeof Goals>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default view — three goals in various states. */
export const Default: Story = {
	parameters: {
		msw: {
			handlers: [http.get('/api/goals', () => HttpResponse.json(STORY_GOALS))]
		}
	}
};

/** Empty state — no goals yet. */
export const Empty: Story = {
	parameters: {
		msw: {
			handlers: [http.get('/api/goals', () => HttpResponse.json([]))]
		}
	}
};

/** Error state — server returns 500. */
export const LoadError: Story = {
	parameters: {
		msw: {
			handlers: [http.get('/api/goals', () => new HttpResponse(null, { status: 500 }))]
		}
	}
};

/** All goals completed. */
export const AllComplete: Story = {
	parameters: {
		msw: {
			handlers: [
				http.get('/api/goals', () =>
					HttpResponse.json(STORY_GOALS.map((g) => ({ ...g, completed: true })))
				)
			]
		}
	}
};

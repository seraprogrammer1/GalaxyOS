/**
 * MSW REST handlers for all GalaxyOS API endpoints.
 *
 * Handlers use the `http://*` wildcard-origin syntax so they work in both
 * environments:
 *   - Browser / Storybook  — MSW service worker resolves against window.origin
 *   - Node.js / Vitest     — MSW v2 requires absolute URLs; the wildcard `*`
 *                            matches any hostname (localhost, 127.0.0.1, …)
 */
import { http, HttpResponse } from 'msw';

// ---------------------------------------------------------------------------
// Stable test fixtures
// ---------------------------------------------------------------------------
export const MOCK_GOALS = [
	{
		_id: 'mock-goal-1',
		title: 'Read 12 Books',
		note: 'Focus on non-fiction this year',
		category: 'Learning',
		completed: false,
		target_value: 12,
		current_value: 3
	},
	{
		_id: 'mock-goal-2',
		title: 'Run a 5K',
		note: '',
		category: 'Fitness',
		completed: false,
		target_value: 1,
		current_value: 0
	},
	{
		_id: 'mock-goal-3',
		title: 'Ship Galaxy OS v1.0',
		note: "We're almost there!",
		category: 'Career',
		completed: true,
		target_value: 1,
		current_value: 1
	}
];

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
export const handlers = [
	// --- Network probe --------------------------------------------------
	http.get('http://*/api/auth/network', () => {
		return HttpResponse.json({ ip_type: 'local' });
	}),

	// --- Goals CRUD -----------------------------------------------------
	http.get('http://*/api/goals', () => {
		return HttpResponse.json(MOCK_GOALS);
	}),

	http.post('http://*/api/goals', async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>;
		const newGoal = {
			_id: `mock-goal-${Date.now()}`,
			note: '',
			category: '',
			completed: false,
			target_value: 1,
			current_value: 0,
			...body
		};
		return HttpResponse.json(newGoal, { status: 201 });
	}),

	http.patch('http://*/api/goals/:id', async ({ request, params }) => {
		const body = (await request.json()) as Record<string, unknown>;
		const goal = MOCK_GOALS.find((g) => g._id === params.id) ?? MOCK_GOALS[0];
		return HttpResponse.json({ ...goal, ...body });
	}),

	http.delete('http://*/api/goals/:id', () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// --- Auth -----------------------------------------------------------
	http.post('http://*/api/auth/login', async ({ request }) => {
		const body = (await request.json()) as { username?: string };
		const role = body.username === 'admin' ? 'admin' : 'user';
		return HttpResponse.json({ role, ip_type: 'local' });
	}),

	http.post('http://*/api/auth/auto', () => {
		return HttpResponse.json({ role: 'admin', ip_type: 'local' });
	}),

	http.post('http://*/api/auth/logout', () => {
		return new HttpResponse(null, { status: 200 });
	})
];

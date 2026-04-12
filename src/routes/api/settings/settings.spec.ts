import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Hoisted mocks — must mirror src/lib/server/models/UserSettings.ts exports
// ---------------------------------------------------------------------------
const { mockFindOneAndUpdate } = vi.hoisted(() => ({
	mockFindOneAndUpdate: vi.fn()
}));

vi.mock('$lib/server/models/UserSettings', () => ({
	UserSettings: {
		findOneAndUpdate: mockFindOneAndUpdate
	}
}));
vi.mock('$lib/server/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const userId = new mongoose.Types.ObjectId().toString();

const makeEvent = ({
	method = 'GET',
	body,
	session
}: {
	method?: string;
	body?: Record<string, unknown>;
	session?: { user_id: string; role: string } | null;
}) => ({
	request: new Request('http://localhost/api/settings', {
		method,
		headers: body ? { 'Content-Type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	}),
	locals: {
		session:
			session !== undefined
				? session
				: {
						user_id: userId,
						role: 'user',
						ip_type: 'local',
						token: 't',
						expires_at: new Date()
					},
		user: null
	}
});

// ---------------------------------------------------------------------------
// GET /api/settings
// ---------------------------------------------------------------------------
describe('GET /api/settings', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('returns 401 when unauthenticated', async () => {
		const { GET } = await import('./+server');
		const event = makeEvent({ session: null });
		const res = await GET(event as never);
		expect(res.status).toBe(401);
	});

	it('returns settings document for the authenticated user (upsert creates defaults)', async () => {
		const defaultSettings = {
			user_id: userId,
			auto_delete: false,
			dashboard_layout: 'bento',
			budget_variant: 'standard'
		};
		mockFindOneAndUpdate.mockResolvedValue(defaultSettings);

		const { GET } = await import('./+server');
		const event = makeEvent({});
		const res = await GET(event as never);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.auto_delete).toBe(false);
		expect(body.dashboard_layout).toBe('bento');
		expect(body.budget_variant).toBe('standard');
		expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
			{ user_id: userId },
			{
				$setOnInsert: {
					auto_delete: false,
					dashboard_layout: 'bento',
					budget_variant: 'standard'
				}
			},
			{ upsert: true, new: true }
		);
	});
});

// ---------------------------------------------------------------------------
// PATCH /api/settings
// ---------------------------------------------------------------------------
describe('PATCH /api/settings', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('returns 401 when unauthenticated', async () => {
		const { PATCH } = await import('./+server');
		const event = makeEvent({ method: 'PATCH', session: null });
		const res = await PATCH(event as never);
		expect(res.status).toBe(401);
	});

	it('updates auto_delete for the authenticated user', async () => {
		const updated = { user_id: userId, auto_delete: true };
		mockFindOneAndUpdate.mockResolvedValue(updated);

		const { PATCH } = await import('./+server');
		const event = makeEvent({ method: 'PATCH', body: { auto_delete: true } });
		const res = await PATCH(event as never);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.auto_delete).toBe(true);
		expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
			{ user_id: userId },
			{ $set: { auto_delete: true } },
			{ upsert: true, new: true }
		);
	});

	it('updates dashboard_layout and budget_variant for the authenticated user', async () => {
		const updated = {
			user_id: userId,
			auto_delete: false,
			dashboard_layout: 'sidebar',
			budget_variant: 'minimal'
		};
		mockFindOneAndUpdate.mockResolvedValue(updated);

		const { PATCH } = await import('./+server');
		const event = makeEvent({
			method: 'PATCH',
			body: { dashboard_layout: 'sidebar', budget_variant: 'minimal' }
		});
		const res = await PATCH(event as never);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.dashboard_layout).toBe('sidebar');
		expect(body.budget_variant).toBe('minimal');
		expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
			{ user_id: userId },
			{ $set: { dashboard_layout: 'sidebar', budget_variant: 'minimal' } },
			{ upsert: true, new: true }
		);
	});
});

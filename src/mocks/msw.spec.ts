/**
 * MSW mock server integration tests.
 *
 * Verifies that the MSW Node server correctly intercepts fetch calls in the
 * Vitest environment and returns our defined mock responses instead of hitting
 * the real backend.
 *
 * RED state: fails until `msw` is installed and `./server` is created.
 */
import { describe, test, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './server';

// A stable base so Node's fetch can resolve the URL
const BASE = 'http://localhost';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MSW mock server', () => {
	describe('GET /api/auth/network', () => {
		test('returns mocked ip_type: "local"', async () => {
			const res = await fetch(`${BASE}/api/auth/network`);
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toEqual({ ip_type: 'local' });
		});
	});

	describe('GET /api/goals', () => {
		test('returns an array of 3 mock goals', async () => {
			const res = await fetch(`${BASE}/api/goals`);
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(Array.isArray(data)).toBe(true);
			expect(data).toHaveLength(3);
			expect(data[0]).toMatchObject({
				title: expect.any(String),
				completed: expect.any(Boolean)
			});
		});
	});

	describe('POST /api/auth/login', () => {
		test('returns 200 with role in body', async () => {
			const res = await fetch(`${BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: 'testuser', password: 'testpass' })
			});
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toMatchObject({ role: expect.any(String) });
		});
	});

	describe('POST /api/auth/auto', () => {
		test('returns 200 with role in body', async () => {
			const res = await fetch(`${BASE}/api/auth/auto`, { method: 'POST' });
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toMatchObject({ role: expect.any(String) });
		});
	});
});

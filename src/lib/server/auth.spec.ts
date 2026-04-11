import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '$lib/server/auth';
import type { UserRole } from '$lib/server/models/User';

const makeLocals = (role: UserRole | null) =>
	({
		session: role
			? { token: 'tok', role, ip_type: 'local', expires_at: new Date(Date.now() + 3600_000) }
			: null
	}) as App.Locals;

describe('requireRole', () => {
	it('should not throw when the session role is in the allowed list', () => {
		expect(() => requireRole(makeLocals('admin'), ['admin', 'temp_admin'])).not.toThrow();
	});

	it('should not throw for temp_admin when temp_admin is allowed', () => {
		expect(() => requireRole(makeLocals('temp_admin'), ['admin', 'temp_admin'])).not.toThrow();
	});

	it('should throw 403 when session role is not in the allowed list', () => {
		expect(() => requireRole(makeLocals('user'), ['admin', 'temp_admin'])).toThrow();
	});

	it('should throw 403 when there is no session (unauthenticated)', () => {
		expect(() => requireRole(makeLocals(null), ['admin'])).toThrow();
	});

	it('should throw 403 when a guest tries to access admin routes', () => {
		expect(() => requireRole(makeLocals('guest'), ['admin', 'temp_admin', 'user'])).toThrow();
	});

	it('should not throw when user accesses a user-allowed route', () => {
		expect(() => requireRole(makeLocals('user'), ['user', 'admin'])).not.toThrow();
	});

	it('should throw with a 403 status code', () => {
		try {
			requireRole(makeLocals('guest'), ['admin']);
			expect.fail('Should have thrown');
		} catch (err: unknown) {
			expect((err as { status: number }).status).toBe(403);
		}
	});

	it('should not throw when pending_pin is explicitly allowed', () => {
		expect(() => requireRole(makeLocals('pending_pin'), ['pending_pin'])).not.toThrow();
	});
});

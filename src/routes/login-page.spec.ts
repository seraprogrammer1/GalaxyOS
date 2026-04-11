import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from './login/+page.server';
import type { ServerLoadEvent } from '@sveltejs/kit';

// Mock isLocalIP so we control IP detection without real network calls
const { mockIsLocalIP } = vi.hoisted(() => ({ mockIsLocalIP: vi.fn() }));
vi.mock('$lib/server/network', () => ({ isLocalIP: mockIsLocalIP }));

const mockSession = {
	token: 'tok',
	role: 'admin',
	ip_type: 'local' as const,
	expires_at: new Date(Date.now() + 3600_000)
};

const makeEvent = (
	locals: App.Locals,
	ip: string,
	fetchResult?: { ok: boolean; status: number }
) =>
	({
		locals,
		getClientAddress: () => ip,
		fetch: vi.fn().mockResolvedValue(
			fetchResult ?? { ok: false, status: 403 }
		),
		cookies: { set: vi.fn(), get: vi.fn(), delete: vi.fn() }
	}) as unknown as ServerLoadEvent;

describe('Login page load function', () => {
	beforeEach(() => {
		vi.resetModules();
		mockIsLocalIP.mockReset();
	});

	it('should redirect to /dashboard if the user already has a valid session', async () => {
		const event = makeEvent({ session: mockSession, user: null }, '192.168.1.1');
		await expect(load(event)).rejects.toMatchObject({ status: 302, location: '/dashboard' });
	});

	it('should attempt POST /api/auth/auto when the client IP is local', async () => {
		mockIsLocalIP.mockReturnValue(true);
		const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
		const event = {
			locals: { session: null, user: null },
			getClientAddress: () => '192.168.1.1',
			fetch: fetchMock,
			cookies: { set: vi.fn(), get: vi.fn(), delete: vi.fn() }
		} as unknown as ServerLoadEvent;
		await load(event);
		expect(fetchMock).toHaveBeenCalledWith('/api/auth/auto', expect.objectContaining({ method: 'POST' }));
	});

	it('should redirect to /dashboard when auto-login succeeds (local IP, 200 response)', async () => {
		mockIsLocalIP.mockReturnValue(true);
		const event = makeEvent({ session: null, user: null }, '192.168.1.1', { ok: true, status: 200 });
		await expect(load(event)).rejects.toMatchObject({ status: 302, location: '/dashboard' });
	});

	it('should NOT call auto-login for an external IP', async () => {
		mockIsLocalIP.mockReturnValue(false);
		const fetchMock = vi.fn();
		const event = {
			locals: { session: null, user: null },
			getClientAddress: () => '8.8.8.8',
			fetch: fetchMock,
			cookies: { set: vi.fn(), get: vi.fn(), delete: vi.fn() }
		} as unknown as ServerLoadEvent;
		await load(event);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('should return { isLocal: true, autoLoginFailed: true } when auto-login is attempted but returns 403', async () => {
		mockIsLocalIP.mockReturnValue(true);
		const event = makeEvent({ session: null, user: null }, '192.168.1.1', { ok: false, status: 403 });
		const result = await load(event);
		expect(result.isLocal).toBe(true);
		expect(result.autoLoginFailed).toBe(true);
	});

	it('should return { isLocal: false } for an external IP so the page shows login forms', async () => {
		mockIsLocalIP.mockReturnValue(false);
		const event = makeEvent({ session: null, user: null }, '8.8.8.8');
		const result = await load(event);
		expect(result.isLocal).toBe(false);
	});
});

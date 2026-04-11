import { describe, it, expect } from 'vitest';
import { load } from './+layout.server';
import type { ServerLoadEvent } from '@sveltejs/kit';

describe('Protected layout guard', () => {
	const makeEvent = (session: App.Locals['session'], pathname: string) =>
		({
			locals: { session, user: null },
			url: new URL(`http://localhost${pathname}`)
		}) as unknown as ServerLoadEvent;

	const mockSession = {
		token: 'tok',
		role: 'admin',
		ip_type: 'local' as const,
		expires_at: new Date(Date.now() + 3600_000)
	};

	it('should redirect unauthenticated users from /dashboard to /login', async () => {
		const event = makeEvent(null, '/dashboard');
		await expect(load(event)).rejects.toMatchObject({ status: 302, location: '/login' });
	});

	it('should redirect unauthenticated users from any protected route to /login', async () => {
		const event = makeEvent(null, '/settings');
		await expect(load(event)).rejects.toMatchObject({ status: 302, location: '/login' });
	});

	it('should allow authenticated users through to protected routes', async () => {
		const event = makeEvent(mockSession, '/dashboard');
		const result = await load(event);
		expect(result).toBeDefined();
		expect(result.session).toMatchObject({ role: 'admin' });
	});

	it('should allow unauthenticated users to access /login', async () => {
		const event = makeEvent(null, '/login');
		const result = await load(event);
		expect(result).toBeDefined();
		expect(result.session).toBeNull();
	});
});

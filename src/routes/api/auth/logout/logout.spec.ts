import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSessionDeleteOne, mockCookiesGet, mockCookiesDelete } = vi.hoisted(() => ({
	mockSessionDeleteOne: vi.fn(),
	mockCookiesGet: vi.fn(),
	mockCookiesDelete: vi.fn()
}));

vi.mock('$lib/server/models/Session', () => ({
	Session: { deleteOne: mockSessionDeleteOne }
}));
vi.mock('$lib/server/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const makeEvent = (token: string | null) => ({
	cookies: {
		get: mockCookiesGet.mockReturnValue(token),
		delete: mockCookiesDelete
	}
});

describe('POST /api/auth/logout', () => {
	beforeEach(() => {
		vi.resetModules();
		mockSessionDeleteOne.mockReset();
		mockCookiesDelete.mockReset();
		mockCookiesGet.mockReset();
	});

	it('should delete the session from the database when a token is present', async () => {
		mockSessionDeleteOne.mockResolvedValue({});
		const { POST } = await import('./+server');
		try {
			await POST(makeEvent('some-token') as never);
		} catch {
			// redirect throws — that's expected
		}
		expect(mockSessionDeleteOne).toHaveBeenCalledWith({ token: 'some-token' });
	});

	it('should clear the session cookie', async () => {
		mockSessionDeleteOne.mockResolvedValue({});
		const { POST } = await import('./+server');
		try {
			await POST(makeEvent('some-token') as never);
		} catch {
			// redirect throws
		}
		expect(mockCookiesDelete).toHaveBeenCalledWith('session', expect.objectContaining({ path: '/' }));
	});

	it('should not throw when no session cookie is present', async () => {
		const { POST } = await import('./+server');
		await expect(POST(makeEvent(null) as never)).rejects.toMatchObject({
			status: 302,
			location: '/login'
		});
		expect(mockSessionDeleteOne).not.toHaveBeenCalled();
	});
});

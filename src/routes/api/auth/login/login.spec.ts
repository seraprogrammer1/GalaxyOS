import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';

const { mockFindOne, mockBcryptCompare, mockSessionCreate, mockIsLocalIP } = vi.hoisted(() => ({
        mockFindOne: vi.fn(),
        mockBcryptCompare: vi.fn(),
        mockSessionCreate: vi.fn().mockResolvedValue({}),
        mockIsLocalIP: vi.fn().mockReturnValue(false)
}));

vi.mock('bcrypt', () => ({ default: { compare: mockBcryptCompare } }));
vi.mock('$lib/server/models/User', () => ({ User: { findOne: mockFindOne } }));
vi.mock('$lib/server/models/Session', () => ({ Session: { create: mockSessionCreate } }));
vi.mock('$lib/server/network', () => ({ isLocalIP: mockIsLocalIP }));
vi.mock('$lib/server/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const makeEvent = (body: Record<string, string>, ip = '8.8.8.8') => ({
        request: new Request('http://localhost/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
        }),
        getClientAddress: () => ip,
        cookies: { get: vi.fn().mockReturnValue(undefined), set: vi.fn(), delete: vi.fn() }
});

describe('POST /api/auth/login', () => {
        beforeEach(() => {
                vi.resetModules();
                mockFindOne.mockReset();
                mockBcryptCompare.mockReset();
                mockSessionCreate.mockReset();
                mockSessionCreate.mockResolvedValue({});
                mockIsLocalIP.mockReturnValue(false);
        });

        it('should return 200 and set an HTTP-only cookie on valid credentials', async () => {
                mockBcryptCompare.mockResolvedValue(true);
                mockFindOne.mockResolvedValue({ _id: 'u1', username: 'admin', password_hash: 'h', role: 'admin' });
                const response = await POST(makeEvent({ username: 'admin', password: 'pw' }) as never);
                expect(response.status).toBe(200);
                const setCookie = response.headers.get('set-cookie');
                expect(setCookie).toContain('session=');
                expect(setCookie).toContain('HttpOnly');
                expect(setCookie).toContain('SameSite=Strict');
        });

        it('should return 401 when the user is not found', async () => {
                mockFindOne.mockResolvedValue(null);
                const response = await POST(makeEvent({ username: 'nobody', password: 'bad' }) as never);
                expect(response.status).toBe(401);
        });

        it('should return 401 when the password does not match', async () => {
                mockBcryptCompare.mockResolvedValue(false);
                mockFindOne.mockResolvedValue({ _id: 'u1', username: 'admin', password_hash: 'h', role: 'admin' });
                const response = await POST(makeEvent({ username: 'admin', password: 'wrong' }) as never);
                expect(response.status).toBe(401);
        });

        it('should return 400 when username or password is missing', async () => {
                const response = await POST(makeEvent({ username: 'admin' }) as never);
                expect(response.status).toBe(400);
        });

        it('should create a Session document on successful login', async () => {
                mockBcryptCompare.mockResolvedValue(true);
                mockFindOne.mockResolvedValue({ _id: 'u1', username: 'user1', password_hash: 'h', role: 'user' });
                await POST(makeEvent({ username: 'user1', password: 'pw' }) as never);
                expect(mockSessionCreate).toHaveBeenCalledWith(expect.objectContaining({ role: 'user' }));
        });
});

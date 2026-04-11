import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
	mockIsLocalIP,
	mockSessionCreate,
	mockSessionFindOne,
	mockSessionDeleteOne,
	mockUserFindOne,
	mockBcryptCompare,
	mockCryptoRandomUUID
} = vi.hoisted(() => ({
	mockIsLocalIP: vi.fn(),
	mockSessionCreate: vi.fn(),
	mockSessionFindOne: vi.fn(),
	mockSessionDeleteOne: vi.fn(),
	mockUserFindOne: vi.fn(),
	mockBcryptCompare: vi.fn(),
	mockCryptoRandomUUID: vi.fn().mockReturnValue('test-uuid-1234')
}));

vi.mock('$lib/server/network', () => ({ isLocalIP: mockIsLocalIP }));
vi.mock('$lib/server/models/Session', () => ({
	Session: {
		create: mockSessionCreate,
		findOne: mockSessionFindOne,
		deleteOne: mockSessionDeleteOne
	}
}));
vi.mock('$lib/server/models/User', () => ({ User: { findOne: mockUserFindOne } }));
vi.mock('bcrypt', () => ({ default: { compare: mockBcryptCompare } }));
vi.mock('$lib/server/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const makeRequest = (body?: Record<string, unknown>) =>
	new Request('http://localhost', {
		method: body ? 'POST' : 'GET',
		headers: body ? { 'Content-Type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});

const makeEvent = (request: Request, ip = '192.168.1.1') =>
	({
		request,
		getClientAddress: () => ip,
		cookies: {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn()
		}
	}) as never;

// ---------------------------------------------------------------------------
// GET /api/auth/network
// ---------------------------------------------------------------------------
describe('GET /api/auth/network', () => {
	beforeEach(() => {
		vi.resetModules();
		mockIsLocalIP.mockReset();
	});

	it('should return { ip_type: "local" } for a local IP', async () => {
		mockIsLocalIP.mockReturnValue(true);
		const { GET } = await import('./network/+server');
		const response = await GET(makeEvent(makeRequest(), '192.168.1.1'));
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.ip_type).toBe('local');
	});

	it('should return { ip_type: "external" } for a public IP', async () => {
		mockIsLocalIP.mockReturnValue(false);
		const { GET } = await import('./network/+server');
		const response = await GET(makeEvent(makeRequest(), '8.8.8.8'));
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.ip_type).toBe('external');
	});
});

// ---------------------------------------------------------------------------
// POST /api/auth/guest
// ---------------------------------------------------------------------------
describe('POST /api/auth/guest', () => {
	beforeEach(() => {
		vi.resetModules();
		mockIsLocalIP.mockReset();
		mockSessionCreate.mockReset();
		mockCryptoRandomUUID.mockReturnValue('test-uuid-1234');
	});

	it('should create a guest session and set cookie for a local IP', async () => {
		mockIsLocalIP.mockReturnValue(true);
		mockSessionCreate.mockResolvedValue({});
		const { POST } = await import('./guest/+server');
		const response = await POST(makeEvent(makeRequest(), '192.168.1.1'));
		expect(response.status).toBe(200);
		expect(mockSessionCreate).toHaveBeenCalledWith(
			expect.objectContaining({ role: 'guest', ip_type: 'local' })
		);
		expect(mockSessionCreate).toHaveBeenCalledWith(
			expect.not.objectContaining({ user_id: expect.anything() })
		);
	});

	it('should return 403 for an external IP requesting guest access', async () => {
		mockIsLocalIP.mockReturnValue(false);
		const { POST } = await import('./guest/+server');
		const response = await POST(makeEvent(makeRequest(), '8.8.8.8'));
		expect(response.status).toBe(403);
		expect(mockSessionCreate).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// POST /api/auth/pin
// ---------------------------------------------------------------------------
describe('POST /api/auth/pin', () => {
	beforeEach(() => {
		vi.resetModules();
		mockIsLocalIP.mockReset();
		mockSessionCreate.mockReset();
		mockSessionFindOne.mockReset();
		mockSessionDeleteOne.mockReset();
		mockBcryptCompare.mockReset();
		mockUserFindOne.mockReset();
	});

	describe('Local PIN login (creates temp_admin)', () => {
		it('should create a temp_admin session when local PIN matches admin_pin_hash', async () => {
			mockIsLocalIP.mockReturnValue(true);
			mockBcryptCompare.mockResolvedValue(true);
			mockUserFindOne.mockResolvedValue({
				_id: 'admin_id',
				username: 'admin',
				role: 'admin',
				admin_pin_hash: 'hashed_pin'
			});
			mockSessionCreate.mockResolvedValue({});
			const { POST } = await import('./pin/+server');
			const response = await POST(makeEvent(makeRequest({ pin: '1234' }), '192.168.1.1'));
			expect(response.status).toBe(200);
			expect(mockSessionCreate).toHaveBeenCalledWith(
				expect.objectContaining({ role: 'temp_admin', ip_type: 'local' })
			);
		});

		it('should return 401 when local PIN does not match', async () => {
			mockIsLocalIP.mockReturnValue(true);
			mockBcryptCompare.mockResolvedValue(false);
			mockUserFindOne.mockResolvedValue({
				_id: 'admin_id',
				username: 'admin',
				role: 'admin',
				admin_pin_hash: 'hashed_pin'
			});
			const { POST } = await import('./pin/+server');
			const response = await POST(makeEvent(makeRequest({ pin: 'wrong' }), '192.168.1.1'));
			expect(response.status).toBe(401);
		});

		it('should return 404 when no admin with a pin_hash exists', async () => {
			mockIsLocalIP.mockReturnValue(true);
			mockUserFindOne.mockResolvedValue(null);
			const { POST } = await import('./pin/+server');
			const response = await POST(makeEvent(makeRequest({ pin: '1234' }), '192.168.1.1'));
			expect(response.status).toBe(404);
		});
	});

	describe('External PIN upgrade (pending_pin → admin)', () => {
		it('should upgrade a pending_pin session to admin when PIN matches', async () => {
			mockIsLocalIP.mockReturnValue(false);
			const existingSession = {
				token: 'pending-tok',
				role: 'pending_pin',
				ip_type: 'external',
				user_id: 'admin_id'
			};
			mockSessionFindOne.mockResolvedValue(existingSession);
			mockUserFindOne.mockResolvedValue({
				_id: 'admin_id',
				username: 'admin',
				role: 'admin',
				admin_pin_hash: 'hashed_pin'
			});
			mockBcryptCompare.mockResolvedValue(true);
			mockSessionDeleteOne.mockResolvedValue({});
			mockSessionCreate.mockResolvedValue({});
			const event = {
				...makeEvent(makeRequest({ pin: '1234' }), '8.8.8.8'),
				cookies: { get: vi.fn().mockReturnValue('pending-tok'), set: vi.fn(), delete: vi.fn() }
			} as never;
			const { POST } = await import('./pin/+server');
			const response = await POST(event);
			expect(response.status).toBe(200);
			expect(mockSessionCreate).toHaveBeenCalledWith(
				expect.objectContaining({ role: 'admin', ip_type: 'external' })
			);
		});

		it('should return 401 when PIN does not match during upgrade', async () => {
			mockIsLocalIP.mockReturnValue(false);
			mockSessionFindOne.mockResolvedValue({
				token: 'pending-tok',
				role: 'pending_pin',
				ip_type: 'external',
				user_id: 'admin_id'
			});
			mockUserFindOne.mockResolvedValue({
				_id: 'admin_id',
				admin_pin_hash: 'hashed_pin'
			});
			mockBcryptCompare.mockResolvedValue(false);
			const event = {
				...makeEvent(makeRequest({ pin: 'bad' }), '8.8.8.8'),
				cookies: { get: vi.fn().mockReturnValue('pending-tok'), set: vi.fn(), delete: vi.fn() }
			} as never;
			const { POST } = await import('./pin/+server');
			const response = await POST(event);
			expect(response.status).toBe(401);
		});

		it('should return 403 if session is not pending_pin for an external IP', async () => {
			mockIsLocalIP.mockReturnValue(false);
			mockSessionFindOne.mockResolvedValue({
				token: 'user-tok',
				role: 'user',
				ip_type: 'external'
			});
			const event = {
				...makeEvent(makeRequest({ pin: '1234' }), '8.8.8.8'),
				cookies: { get: vi.fn().mockReturnValue('user-tok'), set: vi.fn(), delete: vi.fn() }
			} as never;
			const { POST } = await import('./pin/+server');
			const response = await POST(event);
			expect(response.status).toBe(403);
		});
	});
});

// ---------------------------------------------------------------------------
// POST /api/auth/login (updated multi-stage)
// ---------------------------------------------------------------------------
describe('POST /api/auth/login — multi-stage', () => {
	beforeEach(() => {
		vi.resetModules();
		mockIsLocalIP.mockReset();
		mockSessionCreate.mockReset();
		mockUserFindOne.mockReset();
		mockBcryptCompare.mockReset();
		vi.stubEnv('JWT_SECRET', 'test-secret');
	});

	it('should create a user session for a regular user regardless of IP', async () => {
		mockIsLocalIP.mockReturnValue(false);
		mockBcryptCompare.mockResolvedValue(true);
		mockUserFindOne.mockResolvedValue({
			_id: 'user_id',
			username: 'basicuser',
			password_hash: 'hashed',
			role: 'user'
		});
		mockSessionCreate.mockResolvedValue({});
		const { POST } = await import('./login/+server');
		const response = await POST(
			makeEvent(makeRequest({ username: 'basicuser', password: 'pass' }), '8.8.8.8')
		);
		expect(response.status).toBe(200);
		expect(mockSessionCreate).toHaveBeenCalledWith(
			expect.objectContaining({ role: 'user', ip_type: 'external' })
		);
	});

	it('should create an admin session directly when admin logs in from local IP', async () => {
		mockIsLocalIP.mockReturnValue(true);
		mockBcryptCompare.mockResolvedValue(true);
		mockUserFindOne.mockResolvedValue({
			_id: 'admin_id',
			username: 'admin',
			password_hash: 'hashed',
			role: 'admin'
		});
		mockSessionCreate.mockResolvedValue({});
		const { POST } = await import('./login/+server');
		const response = await POST(
			makeEvent(makeRequest({ username: 'admin', password: 'secret' }), '192.168.1.1')
		);
		expect(response.status).toBe(200);
		expect(mockSessionCreate).toHaveBeenCalledWith(
			expect.objectContaining({ role: 'admin', ip_type: 'local' })
		);
	});

	it('should create a pending_pin session when admin logs in from external IP', async () => {
		mockIsLocalIP.mockReturnValue(false);
		mockBcryptCompare.mockResolvedValue(true);
		mockUserFindOne.mockResolvedValue({
			_id: 'admin_id',
			username: 'admin',
			password_hash: 'hashed',
			role: 'admin'
		});
		mockSessionCreate.mockResolvedValue({});
		const { POST } = await import('./login/+server');
		const response = await POST(
			makeEvent(makeRequest({ username: 'admin', password: 'secret' }), '8.8.8.8')
		);
		expect(response.status).toBe(200);
		expect(mockSessionCreate).toHaveBeenCalledWith(
			expect.objectContaining({ role: 'pending_pin', ip_type: 'external' })
		);
	});

	it('should return 401 for invalid credentials', async () => {
		mockUserFindOne.mockResolvedValue(null);
		const { POST } = await import('./login/+server');
		const response = await POST(
			makeEvent(makeRequest({ username: 'nobody', password: 'bad' }), '1.1.1.1')
		);
		expect(response.status).toBe(401);
	});

	it('should return 400 when username or password is missing', async () => {
		const { POST } = await import('./login/+server');
		const response = await POST(makeEvent(makeRequest({ username: 'admin' }), '1.1.1.1'));
		expect(response.status).toBe(400);
	});

	it('should set a session cookie on successful login', async () => {
		mockIsLocalIP.mockReturnValue(false);
		mockBcryptCompare.mockResolvedValue(true);
		mockUserFindOne.mockResolvedValue({
			_id: 'user_id',
			username: 'basicuser',
			password_hash: 'hashed',
			role: 'user'
		});
		mockSessionCreate.mockResolvedValue({});
		const { POST } = await import('./login/+server');
		const response = await POST(
			makeEvent(makeRequest({ username: 'basicuser', password: 'pass' }), '8.8.8.8')
		);
		const setCookie = response.headers.get('set-cookie');
		expect(setCookie).toContain('session=');
		expect(setCookie).toContain('HttpOnly');
	});
});

// ---------------------------------------------------------------------------
// POST /api/auth/auto (local auto-login)
// ---------------------------------------------------------------------------
describe('POST /api/auth/auto', () => {
	beforeEach(() => {
		vi.resetModules();
		mockIsLocalIP.mockReset();
		mockUserFindOne.mockReset();
		mockSessionCreate.mockReset();
	});

	it('should return 403 when the request comes from an external IP', async () => {
		mockIsLocalIP.mockReturnValue(false);
		const { POST } = await import('./auto/+server');
		const response = await POST(makeEvent(makeRequest(), '8.8.8.8'));
		expect(response.status).toBe(403);
		expect(mockSessionCreate).not.toHaveBeenCalled();
	});

	it('should return 404 if no admin user exists in the database', async () => {
		mockIsLocalIP.mockReturnValue(true);
		mockUserFindOne.mockResolvedValue(null);
		const { POST } = await import('./auto/+server');
		const response = await POST(makeEvent(makeRequest(), '192.168.1.1'));
		expect(response.status).toBe(404);
		expect(mockSessionCreate).not.toHaveBeenCalled();
	});

	it('should create an admin session and return 200 for a local IP', async () => {
		mockIsLocalIP.mockReturnValue(true);
		mockUserFindOne.mockResolvedValue({ _id: 'admin_id', username: 'admin', role: 'admin' });
		mockSessionCreate.mockResolvedValue({});
		const { POST } = await import('./auto/+server');
		const response = await POST(makeEvent(makeRequest(), '192.168.1.1'));
		expect(response.status).toBe(200);
		expect(mockSessionCreate).toHaveBeenCalledWith(
			expect.objectContaining({ role: 'admin', ip_type: 'local' })
		);
	});

	it('should set an HttpOnly session cookie on success', async () => {
		mockIsLocalIP.mockReturnValue(true);
		mockUserFindOne.mockResolvedValue({ _id: 'admin_id', username: 'admin', role: 'admin' });
		mockSessionCreate.mockResolvedValue({});
		const { POST } = await import('./auto/+server');
		const response = await POST(makeEvent(makeRequest(), '10.0.0.5'));
		const setCookie = response.headers.get('set-cookie');
		expect(setCookie).toContain('session=');
		expect(setCookie).toContain('HttpOnly');
		expect(setCookie).toContain('SameSite=Strict');
	});

	it('should query for a user with role "admin"', async () => {
		mockIsLocalIP.mockReturnValue(true);
		mockUserFindOne.mockResolvedValue({ _id: 'admin_id', username: 'admin', role: 'admin' });
		mockSessionCreate.mockResolvedValue({});
		const { POST } = await import('./auto/+server');
		await POST(makeEvent(makeRequest(), '127.0.0.1'));
		expect(mockUserFindOne).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }));
	});
});

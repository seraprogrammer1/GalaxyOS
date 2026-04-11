import { describe, it, expect } from 'vitest';

// All 5 roles used across the authorization matrix
const ALL_ROLES = ['admin', 'user', 'temp_admin', 'guest', 'pending_pin'] as const;

describe('User Model — Phase 1.5 extensions', () => {
	it('should accept admin_pin_hash as an optional string', async () => {
		const { User } = await import('./models/User');
		const user = new User({
			username: 'pinadmin',
			password_hash: 'hashed_pw',
			role: 'admin',
			admin_pin_hash: 'hashed_pin_123'
		});
		expect(user.admin_pin_hash).toBe('hashed_pin_123');
		const error = user.validateSync();
		expect(error).toBeUndefined();
	});

	it('should accept guest_pin_hash as an optional string', async () => {
		const { User } = await import('./models/User');
		const user = new User({
			username: 'pinadmin2',
			password_hash: 'hashed_pw',
			role: 'admin',
			guest_pin_hash: 'hashed_guest_pin'
		});
		expect(user.guest_pin_hash).toBe('hashed_guest_pin');
		const error = user.validateSync();
		expect(error).toBeUndefined();
	});

	it('should allow creating a user without pin hashes (they are optional)', async () => {
		const { User } = await import('./models/User');
		const user = new User({ username: 'nopins', password_hash: 'hashed_pw', role: 'user' });
		const error = user.validateSync();
		expect(error).toBeUndefined();
		expect(user.admin_pin_hash).toBeUndefined();
		expect(user.guest_pin_hash).toBeUndefined();
	});

	it.each(ALL_ROLES)('should accept "%s" as a valid role', async (role) => {
		const { User } = await import('./models/User');
		const user = new User({ username: `test_${role}`, password_hash: 'hash', role });
		const error = user.validateSync();
		expect(error).toBeUndefined();
	});
});

describe('Session Model', () => {
	it('should export a Session model', async () => {
		const { Session } = await import('./models/Session');
		expect(Session).toBeDefined();
	});

	it('should create a valid session with all required fields', async () => {
		const { Session } = await import('./models/Session');
		const session = new Session({
			token: 'tok_abc123',
			role: 'admin',
			ip_type: 'local',
			expires_at: new Date(Date.now() + 3600_000)
		});
		const error = session.validateSync();
		expect(error).toBeUndefined();
		expect(session.token).toBe('tok_abc123');
		expect(session.role).toBe('admin');
		expect(session.ip_type).toBe('local');
	});

	it('should allow user_id to be optional (guest sessions have no user)', async () => {
		const { Session } = await import('./models/Session');
		const session = new Session({
			token: 'guest_tok_xyz',
			role: 'guest',
			ip_type: 'local',
			expires_at: new Date(Date.now() + 3600_000)
		});
		const error = session.validateSync();
		expect(error).toBeUndefined();
		expect(session.user_id).toBeUndefined();
	});

	it('should require token', async () => {
		const { Session } = await import('./models/Session');
		const session = new Session({
			role: 'admin',
			ip_type: 'local',
			expires_at: new Date(Date.now() + 3600_000)
		});
		const error = session.validateSync();
		expect(error).toBeDefined();
		expect(error!.errors['token']).toBeDefined();
	});

	it('should require role', async () => {
		const { Session } = await import('./models/Session');
		const session = new Session({
			token: 'tok_123',
			ip_type: 'local',
			expires_at: new Date(Date.now() + 3600_000)
		});
		const error = session.validateSync();
		expect(error).toBeDefined();
		expect(error!.errors['role']).toBeDefined();
	});

	it('should require ip_type', async () => {
		const { Session } = await import('./models/Session');
		const session = new Session({
			token: 'tok_123',
			role: 'admin',
			expires_at: new Date(Date.now() + 3600_000)
		});
		const error = session.validateSync();
		expect(error).toBeDefined();
		expect(error!.errors['ip_type']).toBeDefined();
	});

	it('should require expires_at', async () => {
		const { Session } = await import('./models/Session');
		const session = new Session({ token: 'tok_123', role: 'admin', ip_type: 'local' });
		const error = session.validateSync();
		expect(error).toBeDefined();
		expect(error!.errors['expires_at']).toBeDefined();
	});

	it.each(ALL_ROLES)('should accept "%s" as a valid session role', async (role) => {
		const { Session } = await import('./models/Session');
		const session = new Session({
			token: `tok_${role}`,
			role,
			ip_type: 'local',
			expires_at: new Date(Date.now() + 3600_000)
		});
		const error = session.validateSync();
		expect(error).toBeUndefined();
	});

	it('should reject an invalid role', async () => {
		const { Session } = await import('./models/Session');
		const session = new Session({
			token: 'tok_bad',
			role: 'superadmin',
			ip_type: 'local',
			expires_at: new Date(Date.now() + 3600_000)
		});
		const error = session.validateSync();
		expect(error).toBeDefined();
		expect(error!.errors['role']).toBeDefined();
	});

	it('should only accept "local" or "external" as ip_type', async () => {
		const { Session } = await import('./models/Session');
		const session = new Session({
			token: 'tok_bad_ip',
			role: 'admin',
			ip_type: 'vpn',
			expires_at: new Date(Date.now() + 3600_000)
		});
		const error = session.validateSync();
		expect(error).toBeDefined();
		expect(error!.errors['ip_type']).toBeDefined();
	});

	it('should accept "external" as a valid ip_type', async () => {
		const { Session } = await import('./models/Session');
		const session = new Session({
			token: 'tok_ext',
			role: 'pending_pin',
			ip_type: 'external',
			expires_at: new Date(Date.now() + 3600_000)
		});
		const error = session.validateSync();
		expect(error).toBeUndefined();
	});
});

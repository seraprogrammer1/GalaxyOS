import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We'll mock mongoose so tests don't require a real MongoDB instance
vi.mock('mongoose', async () => {
	const actual = await vi.importActual<typeof import('mongoose')>('mongoose');
	return {
		...actual,
		default: {
			...actual.default,
			connect: vi.fn().mockResolvedValue(undefined),
			connection: {
				readyState: 1,
				on: vi.fn(),
				once: vi.fn()
			}
		}
	};
});

describe('Database Connection', () => {
	beforeEach(() => {
		vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/galaxyos-test');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('should export a connectDB function', async () => {
		const { connectDB } = await import('./db');
		expect(connectDB).toBeDefined();
		expect(typeof connectDB).toBe('function');
	});

	it('should call mongoose.connect with the MONGODB_URI env variable', async () => {
		const mongoose = (await import('mongoose')).default;
		const { connectDB } = await import('./db');
		await connectDB();
		expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/galaxyos-test');
	});
});

describe('User Model', () => {
	it('should export a User model', async () => {
		const { User } = await import('./models/User');
		expect(User).toBeDefined();
	});

	it('should have the correct schema fields', async () => {
		const { User } = await import('./models/User');
		const user = new User({
			username: 'testadmin',
			password_hash: 'hashed_pw_123',
			role: 'admin'
		});
		expect(user.username).toBe('testadmin');
		expect(user.password_hash).toBe('hashed_pw_123');
		expect(user.role).toBe('admin');
	});

	it('should default role to "user"', async () => {
		const { User } = await import('./models/User');
		const user = new User({
			username: 'basicuser',
			password_hash: 'hashed_pw_456'
		});
		expect(user.role).toBe('user');
	});

	it('should require username and password_hash', async () => {
		const { User } = await import('./models/User');
		const user = new User({});
		const error = user.validateSync();
		expect(error).toBeDefined();
		expect(error!.errors['username']).toBeDefined();
		expect(error!.errors['password_hash']).toBeDefined();
	});

	it('should only accept "admin" or "user" as role values', async () => {
		const { User } = await import('./models/User');
		const user = new User({
			username: 'test',
			password_hash: 'hash',
			role: 'superadmin'
		});
		const error = user.validateSync();
		expect(error).toBeDefined();
		expect(error!.errors['role']).toBeDefined();
	});
});

describe('AppSettings Model', () => {
	it('should export an AppSettings model', async () => {
		const { AppSettings } = await import('./models/AppSettings');
		expect(AppSettings).toBeDefined();
	});

	it('should have the correct schema fields', async () => {
		const { AppSettings } = await import('./models/AppSettings');
		const settings = new AppSettings({
			registration_enabled: true,
			default_theme: 'dark'
		});
		expect(settings.registration_enabled).toBe(true);
		expect(settings.default_theme).toBe('dark');
	});

	it('should default registration_enabled to false', async () => {
		const { AppSettings } = await import('./models/AppSettings');
		const settings = new AppSettings({});
		expect(settings.registration_enabled).toBe(false);
	});

	it('should default default_theme to "dark"', async () => {
		const { AppSettings } = await import('./models/AppSettings');
		const settings = new AppSettings({});
		expect(settings.default_theme).toBe('dark');
	});
});

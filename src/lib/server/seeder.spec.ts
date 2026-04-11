import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock bcrypt
vi.mock('bcrypt', () => ({
	default: {
		hash: vi.fn((password: string) => Promise.resolve(`hashed_${password}`))
	}
}));

// Mock User model
const mockCountDocuments = vi.fn();
const mockCreate = vi.fn();
vi.mock('./models/User', () => ({
	User: {
		countDocuments: mockCountDocuments,
		create: mockCreate
	}
}));

// Mock AppSettings model
const mockAppSettingsCountDocuments = vi.fn();
const mockAppSettingsCreate = vi.fn();
vi.mock('./models/AppSettings', () => ({
	AppSettings: {
		countDocuments: mockAppSettingsCountDocuments,
		create: mockAppSettingsCreate
	}
}));

describe('seedDatabase', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubEnv('ADMIN_PASSWORD', 'secret_admin');
		vi.stubEnv('USER_PASSWORD', 'secret_user');
		mockCountDocuments.mockReset();
		mockCreate.mockReset();
		mockAppSettingsCountDocuments.mockReset();
		mockAppSettingsCreate.mockReset();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('should export a seedDatabase function', async () => {
		const { seedDatabase } = await import('./seeder');
		expect(seedDatabase).toBeDefined();
		expect(typeof seedDatabase).toBe('function');
	});

	describe('when the database is empty (User.countDocuments() === 0)', () => {
		beforeEach(() => {
			mockCountDocuments.mockResolvedValue(0);
			mockCreate.mockResolvedValue({});
			mockAppSettingsCountDocuments.mockResolvedValue(0);
			mockAppSettingsCreate.mockResolvedValue({});
		});

		it('should create an admin user with a hashed ADMIN_PASSWORD', async () => {
			const { seedDatabase } = await import('./seeder');
			await seedDatabase();

			expect(mockCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					username: 'admin',
					password_hash: 'hashed_secret_admin',
					role: 'admin'
				})
			);
		});

		it('should create a basic user with a hashed USER_PASSWORD', async () => {
			const { seedDatabase } = await import('./seeder');
			await seedDatabase();

			expect(mockCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					username: 'user',
					password_hash: 'hashed_secret_user',
					role: 'user'
				})
			);
		});

		it('should create default AppSettings', async () => {
			const { seedDatabase } = await import('./seeder');
			await seedDatabase();

			expect(mockAppSettingsCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					registration_enabled: false,
					default_theme: 'dark'
				})
			);
		});
	});

	describe('when the database already has users (User.countDocuments() > 0)', () => {
		beforeEach(() => {
			mockCountDocuments.mockResolvedValue(2);
			mockAppSettingsCountDocuments.mockResolvedValue(1);
		});

		it('should NOT create any users', async () => {
			const { seedDatabase } = await import('./seeder');
			await seedDatabase();

			expect(mockCreate).not.toHaveBeenCalled();
		});

		it('should NOT create AppSettings', async () => {
			const { seedDatabase } = await import('./seeder');
			await seedDatabase();

			expect(mockAppSettingsCreate).not.toHaveBeenCalled();
		});
	});
});

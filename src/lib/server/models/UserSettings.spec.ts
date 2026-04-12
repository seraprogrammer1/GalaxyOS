/**
 * TDD spec for the UserSettings model.
 *
 * Phase 4.5 — Polish & Preferences Patch
 * Covers: schema shape, defaults, uniqueness constraint on user_id.
 *
 * Uses a real MongoDB connection (galaxy_test_db).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/galaxy_test_db';

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('UserSettings model', () => {
	let UserSettings: Awaited<ReturnType<typeof import('./UserSettings').default['then']>>;

	beforeAll(async () => {
		await mongoose.connect(MONGODB_URI);
		const mod = await import('./UserSettings');
		UserSettings = mod.UserSettings as never;
	});

	afterAll(async () => {
		await mongoose.connection.dropCollection('usersettings').catch(() => undefined);
		await mongoose.disconnect();
	});

	it('creates a document with auto_delete defaulting to false', async () => {
		const userId = new mongoose.Types.ObjectId();
		const doc = new (UserSettings as never)({ user_id: userId });
		const saved = await (doc as never).save();
		expect((saved as never).user_id.toString()).toBe(userId.toString());
		expect((saved as never).auto_delete).toBe(false);
		expect((saved as never).dashboard_layout).toBe('bento');
		expect((saved as never).budget_variant).toBe('standard');
	});

	it('allows auto_delete to be set to true', async () => {
		const userId = new mongoose.Types.ObjectId();
		const doc = new (UserSettings as never)({ user_id: userId, auto_delete: true });
		const saved = await (doc as never).save();
		expect((saved as never).auto_delete).toBe(true);
	});

	it('accepts dashboard_layout values and defaults to bento', async () => {
		const userId = new mongoose.Types.ObjectId();
		const defaultDoc = await new (UserSettings as never)({ user_id: userId }).save();
		expect((defaultDoc as never).dashboard_layout).toBe('bento');

		const sidebarUserId = new mongoose.Types.ObjectId();
		const sidebarDoc = await new (UserSettings as never)({
			user_id: sidebarUserId,
			dashboard_layout: 'sidebar'
		}).save();
		expect((sidebarDoc as never).dashboard_layout).toBe('sidebar');

		const columnsUserId = new mongoose.Types.ObjectId();
		const columnsDoc = await new (UserSettings as never)({
			user_id: columnsUserId,
			dashboard_layout: 'columns'
		}).save();
		expect((columnsDoc as never).dashboard_layout).toBe('columns');
	});

	it('accepts budget_variant values and defaults to standard', async () => {
		const userId = new mongoose.Types.ObjectId();
		const defaultDoc = await new (UserSettings as never)({ user_id: userId }).save();
		expect((defaultDoc as never).budget_variant).toBe('standard');

		const minimalUserId = new mongoose.Types.ObjectId();
		const minimalDoc = await new (UserSettings as never)({
			user_id: minimalUserId,
			budget_variant: 'minimal'
		}).save();
		expect((minimalDoc as never).budget_variant).toBe('minimal');
	});

	it('enforces uniqueness on user_id', async () => {
		const userId = new mongoose.Types.ObjectId();
		await new (UserSettings as never)({ user_id: userId }).save();
		const duplicate = new (UserSettings as never)({ user_id: userId });
		await expect((duplicate as never).save()).rejects.toThrow();
	});

	it('throws ValidationError when user_id is missing', async () => {
		const doc = new (UserSettings as never)({});
		await expect((doc as never).save()).rejects.toThrow(/user_id/i);
	});
});

/**
 * Database migration integration tests.
 *
 * Verifies that individual migration scripts correctly transform "legacy"
 * document shapes to the current schema.
 *
 * RED state: fails until the migration file
 *   `./migrations/001-add-default-user-role.ts` is created.
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/galaxy_test_db';

// Unique usernames that won't clash with seeded test data
const LEGACY1 = '__mig_test_legacy1__';
const LEGACY2 = '__mig_test_legacy2__';

describe('Migration: 001-add-default-user-role', () => {
	beforeAll(async () => {
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(MONGODB_URI);
		}
		// Start each run from a clean slate for our test docs
		await mongoose.connection.db!.collection('users').deleteMany({
			username: { $in: [LEGACY1, LEGACY2] }
		});
	});

	afterAll(async () => {
		await mongoose.connection.db!.collection('users').deleteMany({
			username: { $in: [LEGACY1, LEGACY2] }
		});
		await mongoose.disconnect();
	});

	test('adds role: "user" to documents that are missing the role field', async () => {
		const db = mongoose.connection.db!;

		// Insert legacy documents — one without `role`, one already having it
		await db.collection('users').insertMany([
			{ username: LEGACY1, password_hash: 'hash1' }, // legacy: no role
			{ username: LEGACY2, password_hash: 'hash2', role: 'admin' } // already set
		]);

		// Import and run the migration's `up` function directly
		const { up } = await import('./migrations/001-add-default-user-role');
		await up(db);

		const user1 = await db.collection('users').findOne({ username: LEGACY1 });
		const user2 = await db.collection('users').findOne({ username: LEGACY2 });

		expect(user1?.role).toBe('user'); // was missing — now patched
		expect(user2?.role).toBe('admin'); // pre-existing value is preserved
	});

	test('is idempotent: running up() a second time does not change any roles', async () => {
		const db = mongoose.connection.db!;

		const { up } = await import('./migrations/001-add-default-user-role');
		await up(db); // re-run

		const user1 = await db.collection('users').findOne({ username: LEGACY1 });
		const user2 = await db.collection('users').findOne({ username: LEGACY2 });

		expect(user1?.role).toBe('user');
		expect(user2?.role).toBe('admin');
	});
});

/**
 * Migration runner.
 *
 * Discovers all migration files (registered statically below), checks which
 * ones have already been applied by querying the `__migrations` collection,
 * then runs `up()` on each pending migration in order.
 *
 * Called once during server boot (after `connectDB()`) so the database is
 * always in the latest schema state before any requests are handled.
 */
import mongoose from 'mongoose';
import type { Db } from 'mongodb';

// ---------------------------------------------------------------------------
// Migration type contract
// ---------------------------------------------------------------------------
export interface Migration {
	up: (db: Db) => Promise<void>;
	down: (db: Db) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Registry — add new migrations here in chronological order
// ---------------------------------------------------------------------------
import * as m001 from './migrations/001-add-default-user-role';

const MIGRATIONS: Array<{ name: string; migration: Migration }> = [
	{ name: '001-add-default-user-role', migration: m001 }
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
export async function runMigrations(): Promise<void> {
	const db = mongoose.connection.db;
	if (!db) throw new Error('runMigrations: no active database connection');

	// Fetch names of already-applied migrations from the log collection
	const appliedDocs = await db
		.collection<{ name: string }>('__migrations')
		.find({}, { projection: { name: 1 } })
		.toArray();
	const applied = new Set(appliedDocs.map((d) => d.name));

	for (const { name, migration } of MIGRATIONS) {
		if (!applied.has(name)) {
			console.log(`[migrations] Running : ${name}`);
			await migration.up(db);
			await db.collection('__migrations').insertOne({ name, appliedAt: new Date() });
			console.log(`[migrations] Applied : ${name}`);
		}
	}
}

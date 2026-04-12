/**
 * Migration: 001 — add-default-user-role
 *
 * Backfills `role: "user"` on any legacy User documents that were created
 * before the `role` field was made required.
 *
 * Safe to re-run: the $exists filter makes this idempotent.
 */
import type { Db } from 'mongodb';

export async function up(db: Db): Promise<void> {
	await db
		.collection('users')
		.updateMany({ role: { $exists: false } }, { $set: { role: 'user' } });
}

export async function down(_db: Db): Promise<void> {
	// Cannot safely reverse: we don't know which users originally lacked the
	// role field vs those that legitimately had role: 'user'.
}

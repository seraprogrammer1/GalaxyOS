import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import { AccountSnapshot } from '$lib/server/models/AccountSnapshot';
import { syncBalances } from '$lib/server/plaidSync';
import mongoose from 'mongoose';

const STALE_HOURS = Number(process.env.BALANCE_STALE_HOURS ?? 4);

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const snapshots = await AccountSnapshot.find({ owner }).lean();

	const now = Date.now();
	const staleThresholdMs = STALE_HOURS * 3600 * 1000;
	let anyStale = false;

	const accounts: unknown[] = [];
	let lastSyncedAt: Date | null = null;

	for (const snap of snapshots) {
		const age = now - new Date(snap.last_synced_at).getTime();
		if (age > staleThresholdMs) {
			anyStale = true;
			// Background refresh
			PlaidItem.findOne({ item_id: snap.item_id, owner })
				.then((item) => item && syncBalances(item))
				.catch((e) => console.error('[accounts] refresh error:', e));
		}
		accounts.push(...snap.accounts);
		if (!lastSyncedAt || snap.last_synced_at > lastSyncedAt) {
			lastSyncedAt = snap.last_synced_at;
		}
	}

	return json({ accounts, last_synced_at: lastSyncedAt?.toISOString() ?? null, stale: anyStale });
};

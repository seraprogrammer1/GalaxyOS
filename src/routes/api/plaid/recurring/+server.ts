import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { RecurringSnapshot } from '$lib/server/models/RecurringSnapshot';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import { syncRecurring } from '$lib/server/plaidSync';
import mongoose from 'mongoose';

const STALE_HOURS = 24;

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const snapshots = await RecurringSnapshot.find({ owner }).lean();

	const inflow_streams: unknown[] = [];
	const outflow_streams: unknown[] = [];
	let lastSyncedAt: Date | null = null;
	let anyStale = false;

	for (const snap of snapshots) {
		const age = Date.now() - new Date(snap.last_synced_at).getTime();
		if (age > STALE_HOURS * 3600 * 1000) {
			anyStale = true;
			PlaidItem.findOne({ item_id: snap.item_id, owner })
				.then((item) => item && syncRecurring(item))
				.catch((e) => console.error('[recurring] refresh error:', e));
		}
		inflow_streams.push(...snap.inflow_streams);
		outflow_streams.push(...snap.outflow_streams);
		if (!lastSyncedAt || snap.last_synced_at > lastSyncedAt) lastSyncedAt = snap.last_synced_at;
	}

	return json({ inflow_streams, outflow_streams, last_synced_at: lastSyncedAt?.toISOString() ?? null, stale: anyStale });
};

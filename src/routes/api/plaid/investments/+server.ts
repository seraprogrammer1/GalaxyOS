import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { InvestmentSnapshot } from '$lib/server/models/InvestmentSnapshot';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import { syncInvestments } from '$lib/server/plaidSync';
import mongoose from 'mongoose';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const snapshots = await InvestmentSnapshot.find({ owner }).lean();

	const allHoldings: unknown[] = [];
	let totalValue = 0;
	let lastSyncedAt: Date | null = null;
	let anyStale = false;

	for (const snap of snapshots) {
		const age = Date.now() - new Date(snap.last_synced_at).getTime();
		if (age > 4 * 3600 * 1000) {
			anyStale = true;
			PlaidItem.findOne({ item_id: snap.item_id, owner })
				.then((item) => item && syncInvestments(item))
				.catch((e) => console.error('[investments] refresh error:', e));
		}
		allHoldings.push(...snap.holdings);
		totalValue += snap.total_value;
		if (!lastSyncedAt || snap.last_synced_at > lastSyncedAt) lastSyncedAt = snap.last_synced_at;
	}

	// Sort by value descending
	(allHoldings as Record<string, unknown>[]).sort(
		(a, b) => ((b.value as number) ?? 0) - ((a.value as number) ?? 0)
	);

	return json({ holdings: allHoldings, total_value: totalValue, last_synced_at: lastSyncedAt?.toISOString() ?? null, stale: anyStale });
};

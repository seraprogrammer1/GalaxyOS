import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { LiabilitySnapshot } from '$lib/server/models/LiabilitySnapshot';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import { syncLiabilities } from '$lib/server/plaidSync';
import mongoose from 'mongoose';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const snapshots = await LiabilitySnapshot.find({ owner }).lean();

	const credit_cards: unknown[] = [];
	const student_loans: unknown[] = [];
	const mortgages: unknown[] = [];
	let totalDebt = 0;
	let lastSyncedAt: Date | null = null;
	let anyStale = false;

	for (const snap of snapshots) {
		const age = Date.now() - new Date(snap.last_synced_at).getTime();
		if (age > 4 * 3600 * 1000) {
			anyStale = true;
			PlaidItem.findOne({ item_id: snap.item_id, owner })
				.then((item) => item && syncLiabilities(item))
				.catch((e) => console.error('[liabilities] refresh error:', e));
		}
		credit_cards.push(...snap.credit_cards);
		student_loans.push(...snap.student_loans);
		mortgages.push(...snap.mortgages);
		totalDebt += snap.total_debt;
		if (!lastSyncedAt || snap.last_synced_at > lastSyncedAt) lastSyncedAt = snap.last_synced_at;
	}

	return json({ credit_cards, student_loans, mortgages, total_debt: totalDebt, last_synced_at: lastSyncedAt?.toISOString() ?? null, stale: anyStale });
};

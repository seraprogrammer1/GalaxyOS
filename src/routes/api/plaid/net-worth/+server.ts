import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { AccountSnapshot } from '$lib/server/models/AccountSnapshot';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import mongoose from 'mongoose';

const ASSET_TYPES = ['depository', 'investment', 'brokerage'];
const LIABILITY_TYPES = ['credit', 'loan'];

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const [snapshots, items] = await Promise.all([
		AccountSnapshot.find({ owner }).lean(),
		PlaidItem.find({ owner }, { access_token: 0 }).lean()
	]);

	let total_assets = 0;
	let total_liabilities = 0;
	const allAccounts: Record<string, unknown>[] = [];
	let lastSyncedAt: Date | null = null;
	let anyStale = false;

	for (const snap of snapshots) {
		if (!lastSyncedAt || snap.last_synced_at > lastSyncedAt) lastSyncedAt = snap.last_synced_at;
		const age = Date.now() - new Date(snap.last_synced_at).getTime();
		if (age > 4 * 3600 * 1000) anyStale = true;

		for (const acct of snap.accounts as Record<string, unknown>[]) {
			const balance = (acct.balance as number) ?? 0;
			const type = (acct.type as string) ?? '';
			if (ASSET_TYPES.includes(type)) total_assets += balance;
			else if (LIABILITY_TYPES.includes(type)) total_liabilities += balance;
			allAccounts.push(acct);
		}
	}

	const institutionMap = new Map<string, { item_id: string; institution_name: string; assets: number; liabilities: number }>();
	for (const item of items) {
		institutionMap.set(item.item_id, {
			item_id: item.item_id,
			institution_name: item.institution_name,
			assets: 0,
			liabilities: 0
		});
	}
	for (const acct of allAccounts) {
		// Find which item this account belongs to (via institution_name match)
		const instName = acct.institution_name as string;
		for (const inst of institutionMap.values()) {
			if (inst.institution_name === instName) {
				const balance = (acct.balance as number) ?? 0;
				const type = (acct.type as string) ?? '';
				if (ASSET_TYPES.includes(type)) inst.assets += balance;
				else if (LIABILITY_TYPES.includes(type)) inst.liabilities += balance;
			}
		}
	}

	return json({
		net_worth: total_assets - total_liabilities,
		total_assets,
		total_liabilities,
		accounts: allAccounts,
		institutions: [...institutionMap.values()],
		last_synced_at: lastSyncedAt?.toISOString() ?? null,
		stale: anyStale
	});
};

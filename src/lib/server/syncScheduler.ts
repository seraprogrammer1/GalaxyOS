/**
 * Background sync scheduler using node-cron.
 * Runs a full Plaid sync for every linked PlaidItem daily at 03:00.
 * Started once from hooks.server.ts on application boot.
 */

import cron from 'node-cron';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import { fullSync } from '$lib/server/plaidSync';

let started = false;

export function startSyncScheduler(): void {
	if (started) return;
	started = true;

	// Daily at 03:00 local server time
	cron.schedule('0 3 * * *', async () => {
		console.log('[syncScheduler] Starting daily Plaid sync...');
		try {
			const items = await PlaidItem.find({});
			const results = await Promise.allSettled(items.map((item) => fullSync(item)));
			const failed = results.filter((r) => r.status === 'rejected').length;
			console.log(
				`[syncScheduler] Daily sync complete. ${items.length - failed}/${items.length} items synced.`
			);
			if (failed > 0) {
				results.forEach((r, i) => {
					if (r.status === 'rejected') {
						console.error(`[syncScheduler] Item ${items[i]?.item_id} failed:`, r.reason);
					}
				});
			}
		} catch (err) {
			console.error('[syncScheduler] Scheduler error:', err);
		}
	});

	console.log('[syncScheduler] Daily Plaid sync scheduled (03:00).');
}

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import { AccountSnapshot } from '$lib/server/models/AccountSnapshot';
import { InvestmentSnapshot } from '$lib/server/models/InvestmentSnapshot';
import { LiabilitySnapshot } from '$lib/server/models/LiabilitySnapshot';
import { RecurringSnapshot } from '$lib/server/models/RecurringSnapshot';
import { FinancialTransaction } from '$lib/server/models/FinancialTransaction';
import { decrypt } from '$lib/server/encryption';
import { getPlaidClient } from '$lib/server/plaidClient';
import mongoose from 'mongoose';

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const items = await PlaidItem.find({ owner });

	// Best-effort removal from Plaid
	const client = getPlaidClient();
	await Promise.allSettled(
		items.map((item) =>
			client.itemRemove({ access_token: decrypt(item.access_token) })
		)
	);

	// Delete all data
	await Promise.all([
		PlaidItem.deleteMany({ owner }),
		AccountSnapshot.deleteMany({ owner }),
		InvestmentSnapshot.deleteMany({ owner }),
		LiabilitySnapshot.deleteMany({ owner }),
		RecurringSnapshot.deleteMany({ owner }),
		FinancialTransaction.deleteMany({ owner })
	]);

	return json({ status: 'cleared', items_removed: items.length });
};

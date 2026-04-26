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

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const item = await PlaidItem.findOne({ item_id: params.itemId, owner });
	if (!item) return json({ error: 'Item not found' }, { status: 404 });

	// Best-effort Plaid removal
	try {
		const client = getPlaidClient();
		await client.itemRemove({ access_token: decrypt(item.access_token) });
	} catch { /* already removed or error — continue */ }

	const itemId = item.item_id;
	await Promise.all([
		item.deleteOne(),
		AccountSnapshot.deleteMany({ item_id: itemId }),
		InvestmentSnapshot.deleteMany({ item_id: itemId }),
		LiabilitySnapshot.deleteMany({ item_id: itemId }),
		RecurringSnapshot.deleteMany({ item_id: itemId }),
		FinancialTransaction.deleteMany({ item_id: itemId })
	]);

	return json({ status: 'removed', item_id: itemId });
};

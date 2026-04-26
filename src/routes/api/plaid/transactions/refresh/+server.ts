import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import { syncTransactions } from '$lib/server/plaidSync';
import mongoose from 'mongoose';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const items = await PlaidItem.find({ owner });

	const results = await Promise.allSettled(items.map((item) => syncTransactions(item)));

	return json({
		results: items.map((item, i) => ({
			item_id: item.item_id,
			institution_name: item.institution_name,
			...(results[i].status === 'fulfilled'
				? { status: 'synced' }
				: { error: String((results[i] as PromiseRejectedResult).reason) })
		}))
	});
};

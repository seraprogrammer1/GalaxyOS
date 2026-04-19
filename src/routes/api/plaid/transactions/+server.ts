import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { FinancialTransaction } from '$lib/server/models/FinancialTransaction';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import { syncTransactions } from '$lib/server/plaidSync';
import mongoose from 'mongoose';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 500);
	const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
	const category = url.searchParams.get('category') ?? '';

	// Cold-start: trigger sync if no transactions yet
	const count = await FinancialTransaction.countDocuments({ owner });
	if (count === 0) {
		const items = await PlaidItem.find({ owner });
		if (items.length > 0) {
			await Promise.allSettled(items.map((item) => syncTransactions(item)));
		}
	}

	const filter: Record<string, unknown> = { owner };
	if (category) filter.category_primary = category;

	const [added, total] = await Promise.all([
		FinancialTransaction.find(filter).sort({ date: -1 }).skip(offset).limit(limit).lean(),
		FinancialTransaction.countDocuments(filter)
	]);

	return json({ added, modified: [], removed: [], total, limit, offset });
};

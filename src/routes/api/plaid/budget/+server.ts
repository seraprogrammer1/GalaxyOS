import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { FinancialTransaction } from '$lib/server/models/FinancialTransaction';
import mongoose from 'mongoose';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const now = new Date();
	const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
	const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

	const EXCLUDE_CATEGORIES = ['TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_PAYMENTS', 'BANK_FEES'];

	const txns = await FinancialTransaction.find({
		owner,
		pending: false,
		date: { $gte: startOfMonth, $lte: endOfMonth }
	}).lean();

	let spent = 0;
	let income = 0;

	for (const t of txns) {
		if (EXCLUDE_CATEGORIES.includes(t.category_primary)) continue;
		if (t.amount > 0) {
			spent += t.amount;
		} else {
			income += Math.abs(t.amount);
		}
	}

	// Budget ceiling: income-based if available, else pace-based
	const dayOfMonth = now.getDate();
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const total = income > 0 ? income * 0.8 : (spent / dayOfMonth) * daysInMonth;
	const remaining = total - spent;
	const daysLeft = daysInMonth - dayOfMonth;
	const dailyAllowance = daysLeft > 0 ? (remaining / daysLeft).toFixed(2) : '0.00';

	return json({
		remaining: remaining.toFixed(2),
		total: parseFloat(total.toFixed(2)),
		spent: parseFloat(spent.toFixed(2)),
		income: parseFloat(income.toFixed(2)),
		dailyAllowance
	});
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { FinancialTransaction } from '$lib/server/models/FinancialTransaction';
import mongoose from 'mongoose';

const EXCLUDE_CATEGORIES = ['TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_PAYMENTS', 'BANK_FEES'];

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const months = Math.min(parseInt(url.searchParams.get('months') ?? '12', 10), 24);
	const institution = url.searchParams.get('institution') ?? '';

	// Build month buckets going back N months
	const now = new Date();
	const buckets: { year: number; month: number; label: string; income: number; expense: number }[] = [];
	for (let i = months - 1; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		buckets.push({
			year: d.getFullYear(),
			month: d.getMonth() + 1,
			label: d.toLocaleString('en-US', { month: 'short' }),
			income: 0,
			expense: 0
		});
	}

	const earliest = buckets[0];
	const startDate = `${earliest.year}-${String(earliest.month).padStart(2, '0')}-01`;

	const txnFilter: Record<string, unknown> = { owner, pending: false, date: { $gte: startDate } };
	if (institution) txnFilter.institution_name = institution;

	const txns = await FinancialTransaction.find(txnFilter).lean();

	for (const t of txns) {
		if (EXCLUDE_CATEGORIES.includes(t.category_primary)) continue;
		const [year, monthStr] = t.date.split('-');
		const y = parseInt(year, 10);
		const m = parseInt(monthStr, 10);
		const bucket = buckets.find((b) => b.year === y && b.month === m);
		if (!bucket) continue;
		if (t.amount < 0) {
			bucket.income += Math.abs(t.amount);
		} else {
			bucket.expense += t.amount;
		}
	}

	// Refunds: negative expenses already handled above via amount sign
	const prev = buckets[buckets.length - 2];
	const curr = buckets[buckets.length - 1];
	const incomeChangePct = prev && prev.income > 0
		? ((curr.income - prev.income) / prev.income) * 100
		: 0;
	const expenseChangePct = prev && prev.expense > 0
		? ((curr.expense - prev.expense) / prev.expense) * 100
		: 0;

	return json({
		months: buckets.map((b) => ({ month: b.label, year: b.year, income: b.income, expense: b.expense })),
		income_change_pct: parseFloat(incomeChangePct.toFixed(1)),
		expense_change_pct: parseFloat(expenseChangePct.toFixed(1))
	});
};

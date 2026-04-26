/**
 * Background sync helpers — Node.js equivalents of Python's _sync_* functions.
 * Each helper decrypts the Plaid access token, calls the Plaid API, and upserts
 * the result into MongoDB. All functions are fire-and-forget safe.
 */

import type { IPlaidItem } from '$lib/server/models/PlaidItem';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import { AccountSnapshot } from '$lib/server/models/AccountSnapshot';
import { InvestmentSnapshot } from '$lib/server/models/InvestmentSnapshot';
import { LiabilitySnapshot } from '$lib/server/models/LiabilitySnapshot';
import { RecurringSnapshot } from '$lib/server/models/RecurringSnapshot';
import { FinancialTransaction } from '$lib/server/models/FinancialTransaction';
import { decrypt } from '$lib/server/encryption';
import { getPlaidClient } from '$lib/server/plaidClient';

// ─── helpers ──────────────────────────────────────────────────────────────────

function accessToken(item: IPlaidItem): string {
	return decrypt(item.access_token);
}

// ─── individual syncs ─────────────────────────────────────────────────────────

export async function syncBalances(item: IPlaidItem): Promise<void> {
	const client = getPlaidClient();
	const res = await client.accountsBalanceGet({ access_token: accessToken(item) });

	const accounts = res.data.accounts.map((a) => ({
		account_id: a.account_id,
		name: a.name,
		official_name: a.official_name ?? null,
		type: a.type,
		subtype: a.subtype ?? null,
		balance: a.balances.current ?? 0,
		available: a.balances.available ?? null,
		currency: a.balances.iso_currency_code ?? 'USD',
		institution_name: item.institution_name
	}));

	await AccountSnapshot.findOneAndUpdate(
		{ item_id: item.item_id },
		{ $set: { owner: item.owner, accounts, last_synced_at: new Date() } },
		{ upsert: true }
	);
}

export async function syncInvestments(item: IPlaidItem): Promise<void> {
	const client = getPlaidClient();
	try {
		const res = await client.investmentsHoldingsGet({ access_token: accessToken(item) });
		const securityMap = Object.fromEntries(
			res.data.securities.map((s) => [s.security_id, s])
		);

		const holdings = res.data.holdings.map((h) => {
			const sec = securityMap[h.security_id];
			const value = (h.quantity ?? 0) * (h.institution_price ?? 0);
			return {
				account_id: h.account_id,
				security_id: h.security_id,
				name: sec?.name ?? 'Unknown',
				ticker_symbol: sec?.ticker_symbol ?? null,
				quantity: h.quantity ?? 0,
				price: h.institution_price ?? 0,
				value,
				currency: h.iso_currency_code ?? 'USD',
				institution_name: item.institution_name
			};
		});

		const total_value = holdings.reduce((sum, h) => sum + h.value, 0);

		await InvestmentSnapshot.findOneAndUpdate(
			{ item_id: item.item_id },
			{ $set: { owner: item.owner, holdings, total_value, last_synced_at: new Date() } },
			{ upsert: true }
		);
	} catch (err: unknown) {
		// PRODUCT_NOT_READY or item doesn't have investments — skip silently
		const code = (err as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
		if (code !== 'PRODUCT_NOT_READY' && code !== 'PRODUCTS_NOT_SUPPORTED') throw err;
	}
}

export async function syncLiabilities(item: IPlaidItem): Promise<void> {
	const client = getPlaidClient();
	try {
		const res = await client.liabilitiesGet({ access_token: accessToken(item) });
		const liab = res.data.liabilities;

		const credit_cards = (liab.credit ?? []).map((c) => ({
			account_id: c.account_id,
			last_statement_balance: c.last_statement_balance ?? 0,
			minimum_payment: c.minimum_payment_amount ?? 0,
			next_payment_due_date: c.next_payment_due_date ?? null,
			aprs: c.aprs ?? [],
			institution_name: item.institution_name
		}));

		const student_loans = (liab.student ?? []).map((s) => ({
			account_id: s.account_id,
			name: s.loan_name ?? '',
			interest_rate: s.interest_rate_percentage ?? 0,
			origination_principal: s.origination_principal_amount ?? 0,
			outstanding_interest: s.outstanding_interest_amount ?? 0,
			expected_payoff_date: s.expected_payoff_date ?? null,
			institution_name: item.institution_name
		}));

		const mortgages = (liab.mortgage ?? []).map((m) => ({
			account_id: m.account_id,
			loan_type: m.loan_type_description ?? '',
			outstanding_principal: m.origination_principal_amount ?? 0,
			next_monthly_payment: m.next_monthly_payment ?? 0,
			next_payment_due_date: m.next_payment_due_date ?? null,
			maturity_date: m.maturity_date ?? null,
			institution_name: item.institution_name
		}));

		const total_debt =
			credit_cards.reduce((s, c) => s + c.last_statement_balance, 0) +
			student_loans.reduce((s, l) => s + (l.origination_principal - (l.outstanding_interest ?? 0)), 0) +
			mortgages.reduce((s, m) => s + m.outstanding_principal, 0);

		await LiabilitySnapshot.findOneAndUpdate(
			{ item_id: item.item_id },
			{ $set: { owner: item.owner, credit_cards, student_loans, mortgages, total_debt, last_synced_at: new Date() } },
			{ upsert: true }
		);
	} catch (err: unknown) {
		const code = (err as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
		if (code !== 'PRODUCT_NOT_READY' && code !== 'PRODUCTS_NOT_SUPPORTED') throw err;
	}
}

export async function syncRecurring(item: IPlaidItem): Promise<void> {
	const client = getPlaidClient();
	try {
		// Get account IDs first
		const accountsRes = await client.accountsGet({ access_token: accessToken(item) });
		const account_ids = accountsRes.data.accounts.map((a) => a.account_id);

		const res = await client.transactionsRecurringGet({
			access_token: accessToken(item),
			account_ids
		});

		await RecurringSnapshot.findOneAndUpdate(
			{ item_id: item.item_id },
			{
				$set: {
					owner: item.owner,
					inflow_streams: res.data.inflow_streams,
					outflow_streams: res.data.outflow_streams,
					last_synced_at: new Date()
				}
			},
			{ upsert: true }
		);
	} catch (err: unknown) {
		const code = (err as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
		if (code !== 'PRODUCT_NOT_READY' && code !== 'PRODUCTS_NOT_SUPPORTED') throw err;
	}
}

export async function syncTransactions(item: IPlaidItem): Promise<void> {
	const client = getPlaidClient();
	let cursor = item.cursor ?? '';
	let hasMore = true;

	while (hasMore) {
		const res = await client.transactionsSync({
			access_token: accessToken(item),
			cursor: cursor || undefined
		});

		const { added, modified, removed, next_cursor, has_more } = res.data;
		hasMore = has_more;
		cursor = next_cursor;

		const upserts = [...added, ...modified].map((t) => ({
			updateOne: {
				filter: { transaction_id: t.transaction_id },
				update: {
					$set: {
						transaction_id: t.transaction_id,
						item_id: item.item_id,
						account_id: t.account_id,
						owner: item.owner,
						amount: t.amount,
						date: t.date,
						name: t.name,
						merchant_name: t.merchant_name ?? null,
						pending: t.pending ?? false,
						category_primary: t.personal_finance_category?.primary ?? '',
						category_detailed: t.personal_finance_category?.detailed ?? '',
						institution_name: item.institution_name
					}
				},
				upsert: true
			}
		}));

		const deletes = removed.map((r) => ({
			deleteOne: { filter: { transaction_id: r.transaction_id } }
		}));

		const ops = [...upserts, ...deletes];
		if (ops.length > 0) {
			await FinancialTransaction.bulkWrite(ops);
		}
	}

	// Persist the updated cursor
	await PlaidItem.updateOne({ item_id: item.item_id }, { $set: { cursor } });
}

// ─── full sync ────────────────────────────────────────────────────────────────

export async function fullSync(item: IPlaidItem): Promise<void> {
	const tasks: Promise<void>[] = [syncBalances(item)];

	if (item.products.includes('transactions')) {
		tasks.push(syncTransactions(item));
	}
	if (item.products.includes('investments')) {
		tasks.push(syncInvestments(item));
	}
	if (item.products.includes('liabilities')) {
		tasks.push(syncLiabilities(item));
	}
	if (item.products.includes('transactions') || item.products.includes('recurring_transactions')) {
		tasks.push(syncRecurring(item));
	}

	await Promise.allSettled(tasks);
}

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

const PYTHON_BASE = 'http://127.0.0.1:8000';

// ── Dev mock data (returned when Python service is unreachable) ───────────────
const DEV_MOCKS: Record<string, unknown> = {
	transactions: {
		added: [
			{
				transaction_id: 'txn_001',
				account_id: 'acc_chase_001',
				name: 'Spotify Premium',
				merchant_name: 'Spotify',
				amount: 9.99,
				date: new Date(Date.now() - 1 * 86400000).toISOString(),
				category_primary: 'ENTERTAINMENT',
				category_detailed: 'ENTERTAINMENT_MUSIC_AND_AUDIO',
				institution_name: 'Chase',
				pending: false
			},
			{
				transaction_id: 'txn_002',
				account_id: 'acc_boa_001',
				name: 'WHOLEFDS #00001',
				merchant_name: 'Whole Foods Market',
				amount: 87.43,
				date: new Date(Date.now() - 2 * 86400000).toISOString(),
				category_primary: 'FOOD_AND_DRINK',
				category_detailed: 'FOOD_AND_DRINK_GROCERIES',
				institution_name: 'Bank of America',
				pending: false
			},
			{
				transaction_id: 'txn_003',
				account_id: 'acc_chase_001',
				name: 'Uber *TRIP',
				merchant_name: 'Uber',
				amount: 14.75,
				date: new Date(Date.now() - 3 * 86400000).toISOString(),
				category_primary: 'TRANSPORTATION',
				category_detailed: 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES',
				institution_name: 'Chase',
				pending: false
			},
			{
				transaction_id: 'txn_004',
				account_id: 'acc_chase_001',
				name: 'Amazon.com*1A2B3C',
				merchant_name: 'Amazon',
				amount: 52.18,
				date: new Date(Date.now() - 4 * 86400000).toISOString(),
				category_primary: 'GENERAL_MERCHANDISE',
				category_detailed: 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES',
				institution_name: 'Chase',
				pending: false
			},
			{
				transaction_id: 'txn_005',
				account_id: 'acc_wf_001',
				name: 'Paycheck Direct Deposit',
				merchant_name: null,
				amount: -2850.0,
				date: new Date(Date.now() - 5 * 86400000).toISOString(),
				category_primary: 'INCOME',
				category_detailed: 'INCOME_WAGES',
				institution_name: 'Wells Fargo',
				pending: false
			},
			{
				transaction_id: 'txn_006',
				account_id: 'acc_chase_001',
				name: 'NETFLIX.COM',
				merchant_name: 'Netflix',
				amount: 15.49,
				date: new Date(Date.now() - 6 * 86400000).toISOString(),
				category_primary: 'ENTERTAINMENT',
				category_detailed: 'ENTERTAINMENT_TV_AND_MOVIES',
				institution_name: 'Chase',
				pending: true
			},
			{
				transaction_id: 'txn_007',
				account_id: 'acc_boa_001',
				name: 'CVS/PHARMACY',
				merchant_name: 'CVS Pharmacy',
				amount: 23.12,
				date: new Date(Date.now() - 7 * 86400000).toISOString(),
				category_primary: 'MEDICAL',
				category_detailed: 'MEDICAL_PHARMACIES_AND_SUPPLEMENTS',
				institution_name: 'Bank of America',
				pending: false
			},
			{
				transaction_id: 'txn_008',
				account_id: 'acc_chase_001',
				name: 'STARBUCKS #12345',
				merchant_name: 'Starbucks',
				amount: 6.75,
				date: new Date(Date.now() - 8 * 86400000).toISOString(),
				category_primary: 'FOOD_AND_DRINK',
				category_detailed: 'FOOD_AND_DRINK_COFFEE',
				institution_name: 'Chase',
				pending: false
			},
			{
				transaction_id: 'txn_009',
				account_id: 'acc_chase_001',
				name: 'SHELL OIL 57444891',
				merchant_name: 'Shell',
				amount: 58.20,
				date: new Date(Date.now() - 9 * 86400000).toISOString(),
				category_primary: 'TRANSPORTATION',
				category_detailed: 'TRANSPORTATION_GAS_STATIONS',
				institution_name: 'Chase',
				pending: false
			},
			{
				transaction_id: 'txn_010',
				account_id: 'acc_boa_001',
				name: 'ELECTRIC UTILITY PMT',
				merchant_name: 'City Power Co.',
				amount: 94.00,
				date: new Date(Date.now() - 10 * 86400000).toISOString(),
				category_primary: 'HOME_IMPROVEMENT',
				category_detailed: 'HOME_IMPROVEMENT_UTILITIES',
				institution_name: 'Bank of America',
				pending: false
			}
		],
		modified: [],
		removed: []
	},
	'net-worth': {
		total_net_worth: 42580.5,
		accounts: [
			{ name: 'Chase Checking', subtype: 'checking', balance: 3420.75, institution_name: 'Chase' },
			{ name: 'Chase Savings', subtype: 'savings', balance: 12800.0, institution_name: 'Chase' },
			{
				name: 'BofA Checking',
				subtype: 'checking',
				balance: 1890.25,
				institution_name: 'Bank of America'
			},
			{
				name: 'Vanguard Roth IRA',
				subtype: 'ira',
				balance: 24469.5,
				institution_name: 'Vanguard'
			}
		],
		institutions: [{ id: 'ins_001', name: 'Chase' }, { id: 'ins_002', name: 'Bank of America' }]
	},
	budget: {
		spent: 1847.32,
		total: 3500,
		categories: [
			{ name: 'Food and Drink', spent: 642.8, limit: 800 },
			{ name: 'Transportation', spent: 215.0, limit: 300 },
			{ name: 'Entertainment', spent: 124.48, limit: 200 },
			{ name: 'Shopping', spent: 528.4, limit: 600 },
			{ name: 'Healthcare', spent: 85.0, limit: 150 },
			{ name: 'Other', spent: 251.64, limit: 450 }
		]
	},
	recurring: {
		inflow_streams: [
			{
				stream_id: 'stream_in_001',
				account_id: 'acc_wf_001',
				description: 'Paycheck Direct Deposit',
				merchant_name: null,
				frequency: 'BIWEEKLY',
				average_amount: -2850.0,
				last_amount: -2850.0,
				last_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
				predicted_next_date: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0],
				status: 'MATURE',
				is_active: true,
				category: 'INCOME',
				institution_name: 'Wells Fargo'
			}
		],
		outflow_streams: [
			{
				stream_id: 'stream_out_001',
				account_id: 'acc_chase_001',
				description: 'Rent Payment',
				merchant_name: 'Landlord Properties LLC',
				frequency: 'MONTHLY',
				average_amount: 1450.0,
				last_amount: 1450.0,
				last_date: new Date(Date.now() - 17 * 86400000).toISOString().split('T')[0],
				predicted_next_date: new Date(Date.now() + 13 * 86400000).toISOString().split('T')[0],
				status: 'MATURE',
				is_active: true,
				category: 'RENT_AND_UTILITIES',
				institution_name: 'Chase'
			},
			{
				stream_id: 'stream_out_002',
				account_id: 'acc_chase_001',
				description: 'NETFLIX.COM',
				merchant_name: 'Netflix',
				frequency: 'MONTHLY',
				average_amount: 15.49,
				last_amount: 15.49,
				last_date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
				predicted_next_date: new Date(Date.now() + 24 * 86400000).toISOString().split('T')[0],
				status: 'MATURE',
				is_active: true,
				category: 'ENTERTAINMENT',
				institution_name: 'Chase'
			},
			{
				stream_id: 'stream_out_003',
				account_id: 'acc_chase_001',
				description: 'Spotify Premium',
				merchant_name: 'Spotify',
				frequency: 'MONTHLY',
				average_amount: 9.99,
				last_amount: 9.99,
				last_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
				predicted_next_date: new Date(Date.now() + 29 * 86400000).toISOString().split('T')[0],
				status: 'MATURE',
				is_active: true,
				category: 'ENTERTAINMENT',
				institution_name: 'Chase'
			}
		]
	},
	investments: {
		total_value: 24469.5,
		holdings: [
			{ name: 'VTSAX', quantity: 120.5, value: 14200.0 },
			{ name: 'VXUS', quantity: 80.0, value: 4800.0 },
			{ name: 'BND', quantity: 55.0, value: 5469.5 }
		]
	},
	liabilities: {
		credit_cards: [{ name: 'Chase Sapphire', balance: 524.18, limit: 10000 }],
		student_loans: [],
		mortgages: []
	},
	'money-flow': {
		income_change_pct: 3.2,
		expense_change_pct: -1.8,
		months: [
			{ month: 'Oct', income: 5700, expense: 3200 },
			{ month: 'Nov', income: 5700, expense: 3850 },
			{ month: 'Dec', income: 5700, expense: 4200 },
			{ month: 'Jan', income: 5700, expense: 3100 },
			{ month: 'Feb', income: 5700, expense: 2980 },
			{ month: 'Mar', income: 5700, expense: 3420 },
			{ month: 'Apr', income: 5700, expense: 1847 }
		]
	}
};

/**
 * Forward a request to the Python Plaid service.
 * Adds X-Session-Token header so Python can independently validate auth.
 * First gate: caller must be 'admin' — if not, returns 403 before forwarding.
 *
 * When USE_PLAID_MOCKS=true (or the Python service is unreachable in dev),
 * returns realistic mock data so the budget UI can be tested without Plaid.
 */
export async function proxyToPlaid(
	event: RequestEvent,
	path: string,
	method: 'GET' | 'POST' | 'DELETE',
	body?: unknown
): Promise<Response> {
	if (!event.locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	if (event.locals.session.role !== 'admin') {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	// ── Dev mock override ─────────────────────────────────────────────────────
	if (process.env.USE_PLAID_MOCKS === 'true') {
		const mockData = DEV_MOCKS[path];
		if (mockData !== undefined) return json(mockData, { status: 200 });
	}

	const url = `${PYTHON_BASE}/api/plaid/${path}`;
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'X-Session-Token': event.locals.session.token,
	};

	let pythonRes: Response;
	try {
		pythonRes = await fetch(url, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
	} catch {
		// ── Fallback to mock data when Python service is unreachable ──────────
		const mockData = DEV_MOCKS[path];
		if (mockData !== undefined) {
			console.warn(`[plaidProxy] Python service unreachable — serving mock data for /${path}`);
			return json(mockData, { status: 200 });
		}
		return json(
			{ error: 'Python service unreachable — ensure the service is running.' },
			{ status: 503 }
		);
	}

	const data = await pythonRes.json().catch(() => ({}));
	return json(data, { status: pythonRes.status });
}

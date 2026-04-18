// Plaid mock data for Storybook stories and tests

export const mockItems = [
	{
		item_id: 'item_chase_001',
		institution_name: 'Chase',
		institution_id: 'ins_56',
		products: ['transactions', 'investments', 'liabilities'],
		linked_at: '2026-03-01T10:00:00Z',
	},
	{
		item_id: 'item_fidelity_002',
		institution_name: 'Fidelity',
		institution_id: 'ins_116',
		products: ['transactions', 'investments'],
		linked_at: '2026-03-15T14:30:00Z',
	},
];

export const mockNetWorth = {
	net_worth: 142800,
	total_assets: 185300,
	total_liabilities: 42500,
	institutions: [
		{
			item_id: 'item_chase_001',
			institution_name: 'Chase',
			accounts: [
				{ account_id: 'acc_001', name: 'Chase Checking', type: 'depository', subtype: 'checking', balance: 4200 },
				{ account_id: 'acc_002', name: 'Chase Savings', type: 'depository', subtype: 'savings', balance: 18100 },
				{ account_id: 'acc_003', name: 'Chase Sapphire', type: 'credit', subtype: 'credit card', balance: -2400 },
			],
		},
		{
			item_id: 'item_fidelity_002',
			institution_name: 'Fidelity',
			accounts: [
				{ account_id: 'acc_004', name: 'Fidelity Brokerage', type: 'investment', subtype: 'brokerage', balance: 163000 },
			],
		},
	],
};

export const mockBudget = {
	remaining: '$4,520',
	total: 6000,
	spent: 1480,
	dailyAllowance: '$150',
};

export const mockTransactions = {
	added: [
		{ transaction_id: 'txn_001', account_id: 'acc_001', date: '2026-04-15', name: 'WHOLEFDS #00001', merchant_name: 'Whole Foods Market', amount: 84.32, category_primary: 'FOOD_AND_DRINK', category_detailed: 'FOOD_AND_DRINK_GROCERIES', pending: false, institution_name: 'Chase' },
		{ transaction_id: 'txn_002', account_id: 'acc_001', date: '2026-04-14', name: 'NETFLIX.COM', merchant_name: 'Netflix', amount: 15.49, category_primary: 'ENTERTAINMENT', category_detailed: 'ENTERTAINMENT_TV_AND_MOVIES', pending: false, institution_name: 'Chase' },
		{ transaction_id: 'txn_003', account_id: 'acc_001', date: '2026-04-14', name: 'SHELL OIL 57444891', merchant_name: 'Shell', amount: 62.10, category_primary: 'TRANSPORTATION', category_detailed: 'TRANSPORTATION_GAS_STATIONS', pending: false, institution_name: 'Chase' },
		{ transaction_id: 'txn_004', account_id: 'acc_001', date: '2026-04-13', name: 'Amazon.com*1A2B3C', merchant_name: 'Amazon', amount: 47.99, category_primary: 'GENERAL_MERCHANDISE', category_detailed: 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES', pending: true, institution_name: 'Chase' },
		{ transaction_id: 'txn_005', account_id: 'acc_001', date: '2026-04-12', name: 'STARBUCKS #12345', merchant_name: 'Starbucks', amount: 6.75, category_primary: 'FOOD_AND_DRINK', category_detailed: 'FOOD_AND_DRINK_COFFEE', pending: false, institution_name: 'Chase' },
		{ transaction_id: 'txn_006', account_id: 'acc_002', date: '2026-04-11', name: 'Direct Deposit - Employer', merchant_name: null, amount: -3200.00, category_primary: 'INCOME', category_detailed: 'INCOME_WAGES', pending: false, institution_name: 'Chase' },
		{ transaction_id: 'txn_007', account_id: 'acc_001', date: '2026-04-10', name: 'PLANET FITNESS', merchant_name: 'Planet Fitness', amount: 49.00, category_primary: 'PERSONAL_CARE', category_detailed: 'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS', pending: false, institution_name: 'Chase' },
		{ transaction_id: 'txn_008', account_id: 'acc_001', date: '2026-04-09', name: 'Uber *TRIP', merchant_name: 'Uber', amount: 18.40, category_primary: 'TRANSPORTATION', category_detailed: 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES', pending: false, institution_name: 'Chase' },
		{ transaction_id: 'txn_009', account_id: 'acc_001', date: '2026-04-08', name: "TRADER JOE'S #123", merchant_name: "Trader Joe's", amount: 56.20, category_primary: 'FOOD_AND_DRINK', category_detailed: 'FOOD_AND_DRINK_GROCERIES', pending: false, institution_name: 'Chase' },
		{ transaction_id: 'txn_010', account_id: 'acc_002', date: '2026-04-07', name: 'ELECTRIC UTILITY PMT', merchant_name: 'City Power Co.', amount: 94.00, category_primary: 'HOME_IMPROVEMENT', category_detailed: 'HOME_IMPROVEMENT_UTILITIES', pending: false, institution_name: 'Chase' },
	],
	modified: [
		{ transaction_id: 'txn_002', account_id: 'acc_001', date: '2026-04-14', name: 'NETFLIX.COM', merchant_name: 'Netflix', amount: 15.49, category_primary: 'ENTERTAINMENT', category_detailed: 'ENTERTAINMENT_TV_AND_MOVIES', pending: false, institution_name: 'Chase' },
		{ transaction_id: 'txn_005', account_id: 'acc_001', date: '2026-04-12', name: 'STARBUCKS #12345', merchant_name: 'Starbucks', amount: 6.75, category_primary: 'FOOD_AND_DRINK', category_detailed: 'FOOD_AND_DRINK_COFFEE', pending: false, institution_name: 'Chase' },
	],
	removed: ['txn_000'],
	next_cursor: 'cursor_abc123',
};

export const mockRecurring = {
	inflow_streams: [
		{
			stream_id: 'stream_in_001',
			account_id: 'acc_002',
			description: 'Direct Deposit - Employer',
			merchant_name: null,
			frequency: 'BIWEEKLY',
			average_amount: -3200.00,
			last_amount: -3200.00,
			last_date: '2026-04-11',
			predicted_next_date: '2026-04-25',
			status: 'MATURE',
			is_active: true,
			category: 'INCOME',
			institution_name: 'Chase',
		},
		{
			stream_id: 'stream_in_002',
			account_id: 'acc_002',
			description: 'Freelance Payment',
			merchant_name: 'Client LLC',
			frequency: 'MONTHLY',
			average_amount: -800.00,
			last_amount: -800.00,
			last_date: '2026-04-01',
			predicted_next_date: '2026-05-01',
			status: 'MATURE',
			is_active: true,
			category: 'INCOME',
			institution_name: 'Chase',
		},
	],
	outflow_streams: [
		{
			stream_id: 'stream_out_001',
			account_id: 'acc_001',
			description: 'Rent',
			merchant_name: 'Landlord Properties',
			frequency: 'MONTHLY',
			average_amount: 1800.00,
			last_amount: 1800.00,
			last_date: '2026-04-01',
			predicted_next_date: '2026-05-01',
			status: 'MATURE',
			is_active: true,
			category: 'RENT_AND_UTILITIES',
			institution_name: 'Chase',
		},
		{
			stream_id: 'stream_out_002',
			account_id: 'acc_001',
			description: 'NETFLIX.COM',
			merchant_name: 'Netflix',
			frequency: 'MONTHLY',
			average_amount: 15.49,
			last_amount: 15.49,
			last_date: '2026-04-14',
			predicted_next_date: '2026-05-14',
			status: 'MATURE',
			is_active: true,
			category: 'ENTERTAINMENT',
			institution_name: 'Chase',
		},
		{
			stream_id: 'stream_out_003',
			account_id: 'acc_002',
			description: 'ELECTRIC UTILITY PMT',
			merchant_name: 'City Power Co.',
			frequency: 'MONTHLY',
			average_amount: 94.00,
			last_amount: 94.00,
			last_date: '2026-04-07',
			predicted_next_date: '2026-05-07',
			status: 'MATURE',
			is_active: true,
			category: 'HOME_IMPROVEMENT',
			institution_name: 'Chase',
		},
		{
			stream_id: 'stream_out_004',
			account_id: 'acc_001',
			description: 'AT&T Wireless',
			merchant_name: 'AT&T',
			frequency: 'MONTHLY',
			average_amount: 85.00,
			last_amount: 85.00,
			last_date: '2026-04-10',
			predicted_next_date: '2026-05-10',
			status: 'MATURE',
			is_active: true,
			category: 'RENT_AND_UTILITIES',
			institution_name: 'Chase',
		},
		{
			stream_id: 'stream_out_005',
			account_id: 'acc_001',
			description: 'PLANET FITNESS',
			merchant_name: 'Planet Fitness',
			frequency: 'MONTHLY',
			average_amount: 49.00,
			last_amount: 49.00,
			last_date: '2026-04-10',
			predicted_next_date: '2026-05-10',
			status: 'MATURE',
			is_active: true,
			category: 'PERSONAL_CARE',
			institution_name: 'Chase',
		},
	],
};

export const mockInvestments = {
	total_value: 163000,
	holdings: [
		{ security_id: 'sec_001', ticker_symbol: 'AAPL', name: 'Apple Inc.', quantity: 40, institution_price: 175.50, market_value: 7020, cost_basis: 4800 },
		{ security_id: 'sec_002', ticker_symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', quantity: 280, institution_price: 245.10, market_value: 68628, cost_basis: 52000 },
		{ security_id: 'sec_003', ticker_symbol: 'BND', name: 'Vanguard Total Bond Market ETF', quantity: 300, institution_price: 73.80, market_value: 22140, cost_basis: 24000 },
		{ security_id: 'sec_004', ticker_symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', quantity: 420, institution_price: 58.60, market_value: 24612, cost_basis: 20000 },
	],
};

export const mockLiabilities = {
	total_debt: 42500,
	credit_cards: [
		{
			account_id: 'acc_003',
			name: 'Chase Sapphire Preferred',
			balance: 2400,
			minimum_payment_amount: 35,
			next_payment_due_date: '2026-05-02',
			aprs: [{ apr_percentage: 21.99, apr_type: 'PURCHASE_APR', balance_subject_to_apr: 2400 }],
		},
		{
			account_id: 'acc_cc_002',
			name: 'American Express Blue Cash',
			balance: 640,
			minimum_payment_amount: 25,
			next_payment_due_date: '2026-05-08',
			aprs: [{ apr_percentage: 19.49, apr_type: 'PURCHASE_APR', balance_subject_to_apr: 640 }],
		},
	],
	student_loans: [
		{
			account_id: 'acc_sl_001',
			name: 'Federal Student Loan',
			balance: 39460,
			minimum_payment_amount: 412,
			next_payment_due_date: '2026-05-15',
			interest_rate_percentage: 5.05,
			origination_date: '2020-08-01',
		},
	],
	mortgages: [],
};

export const mockMoneyFlow = {
	months: [
		{ month: 'Jan', year: 2026, income: 8200, expense: 5800 },
		{ month: 'Feb', year: 2026, income: 7900, expense: 6100 },
		{ month: 'Mar', year: 2026, income: 10000, expense: 7200 },
		{ month: 'Apr', year: 2026, income: 8500, expense: 6222 },
		{ month: 'May', year: 2026, income: 7600, expense: 5400 },
		{ month: 'Jun', year: 2026, income: 8100, expense: 5900 },
		{ month: 'Jul', year: 2026, income: 8800, expense: 6500 },
	],
	income_change_pct: 6.3,
	expense_change_pct: 2.4,
};

<script lang="ts">
	type StatType = 'balance' | 'income' | 'expense' | 'savings';

	let {
		open = $bindable<StatType | null>(null),
		netWorthData,
		recurringData,
		txnData,
		investData,
		spendingByCategory,
	}: {
		open: StatType | null;
		netWorthData: Record<string, unknown> | null;
		recurringData: Record<string, unknown> | null;
		txnData: Record<string, unknown> | null;
		investData: Record<string, unknown> | null;
		spendingByCategory: { name: string; amount: number; pct: number; color: string }[];
	} = $props();

	// ── Frequency multipliers (monthly normalisation) ─────────────────────────
	const freqMultiplier: Record<string, number> = {
		WEEKLY: 4.33,
		BIWEEKLY: 2.17,
		SEMI_MONTHLY: 2,
		MONTHLY: 1,
		QUARTERLY: 1 / 3,
		ANNUALLY: 1 / 12,
	};

	const freqLabel: Record<string, string> = {
		WEEKLY: 'Weekly',
		BIWEEKLY: 'Bi-weekly',
		SEMI_MONTHLY: 'Semi-monthly',
		MONTHLY: 'Monthly',
		QUARTERLY: 'Quarterly',
		ANNUALLY: 'Annual',
	};

	// ── Derived data per stat type ────────────────────────────────────────────

	type Account = Record<string, unknown>;

	const allAccounts = $derived(
		(netWorthData?.accounts as Account[]) ?? []
	);

	// Balance: all accounts sorted by balance desc, grouped by institution
	const balanceRows = $derived(
		[...allAccounts].sort((a, b) => ((b.balance as number) ?? 0) - ((a.balance as number) ?? 0))
	);

	// Income: inflow streams with normalised monthly amount
	type IncomeRow = { name: string; frequency: string; monthlyAmt: number };
	const incomeRows = $derived.by((): IncomeRow[] => {
		const streams = (recurringData?.inflow_streams as Account[]) ?? [];
		return streams.map((s) => {
			const raw = Math.abs((s.average_amount as Record<string, number>)?.amount ?? 0);
			const freq = String(s.frequency ?? '');
			const mult = freqMultiplier[freq] ?? 1;
			const name =
				String(s.description ?? s.merchant_name ?? s.name ?? 'Unknown');
			return { name, frequency: freq, monthlyAmt: raw * mult };
		}).sort((a, b) => b.monthlyAmt - a.monthlyAmt);
	});

	const incomeTotal = $derived(incomeRows.reduce((s, r) => s + r.monthlyAmt, 0));

	// Expense: spendingByCategory passed in directly, compute total
	const expenseTotal = $derived(spendingByCategory.reduce((s, c) => s + c.amount, 0));

	// Savings: savings/CD/money-market accounts + investment total
	const savingsTypes = ['savings', 'cd', 'money market'];
	const savingsAccounts = $derived(
		allAccounts.filter((a) => savingsTypes.includes(String(a.subtype ?? '').toLowerCase()))
	);
	const savingsAccountTotal = $derived(
		savingsAccounts.reduce((s, a) => s + ((a.balance as number) ?? 0), 0)
	);
	const investTotal = $derived((investData?.total_value as number) ?? 0);
	const savingsGrandTotal = $derived(savingsAccountTotal + investTotal);

	// ── Helpers ───────────────────────────────────────────────────────────────
	function fmt(n: number): string {
		return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	function titleFor(type: StatType): string {
		return { balance: 'Account Balances', income: 'Monthly Income Sources', expense: 'Spending by Category', savings: 'Savings Breakdown' }[type];
	}

	// ── Close helpers ─────────────────────────────────────────────────────────
	function close() { open = null; }
	function handleKeydown(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open !== null}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={close}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-panel glass" onclick={(e) => e.stopPropagation()}>

			<div class="modal-header">
				<h2>{titleFor(open)}</h2>
				<button class="close-btn" onclick={close} aria-label="Close">✕</button>
			</div>

			<div class="modal-body">

				<!-- ── Balance ─────────────────────────────────────────────────────── -->
				{#if open === 'balance'}
					{#if balanceRows.length === 0}
						<p class="empty">No account data available.</p>
					{:else}
						<table class="detail-table">
							<thead>
								<tr>
									<th>Account</th>
									<th>Institution</th>
									<th>Type</th>
									<th class="num">Balance</th>
								</tr>
							</thead>
							<tbody>
								{#each balanceRows as acct}
									<tr>
										<td>{String(acct.name ?? '—')}</td>
										<td class="muted">{String(acct.institution_name ?? '—')}</td>
										<td><span class="type-chip">{String(acct.subtype ?? acct.type ?? '—')}</span></td>
										<td class="num amount">${fmt((acct.balance as number) ?? 0)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
						<div class="total-row">
							<span>Total Balance</span>
							<span class="total-val">${fmt(balanceRows.reduce((s, a) => s + ((a.balance as number) ?? 0), 0))}</span>
						</div>
					{/if}

				<!-- ── Income ──────────────────────────────────────────────────────── -->
				{:else if open === 'income'}
					{#if incomeRows.length === 0}
						<p class="empty">No recurring income streams found.</p>
					{:else}
						<table class="detail-table">
							<thead>
								<tr>
									<th>Source</th>
									<th>Frequency</th>
									<th class="num">Monthly Est.</th>
								</tr>
							</thead>
							<tbody>
								{#each incomeRows as row}
									<tr>
										<td>{row.name}</td>
										<td class="muted">{freqLabel[row.frequency] ?? row.frequency}</td>
										<td class="num amount income">${fmt(row.monthlyAmt)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
						<div class="total-row">
							<span>Total Monthly Income</span>
							<span class="total-val income">${fmt(incomeTotal)}</span>
						</div>
					{/if}

				<!-- ── Expense ─────────────────────────────────────────────────────── -->
				{:else if open === 'expense'}
					{#if spendingByCategory.length === 0}
						<p class="empty">No spending data available for this month.</p>
					{:else}
						<div class="cat-list">
							{#each spendingByCategory as cat}
								<div class="cat-row">
									<div class="cat-label-row">
										<span class="cat-dot" style="background:{cat.color}"></span>
										<span class="cat-name">{cat.name}</span>
										<span class="cat-pct muted">{cat.pct.toFixed(1)}%</span>
										<span class="cat-amt">${fmt(cat.amount)}</span>
									</div>
									<div class="progress-track">
										<div class="progress-fill" style="width:{cat.pct}%;background:{cat.color}"></div>
									</div>
								</div>
							{/each}
						</div>
						<div class="total-row">
							<span>Total Spending</span>
							<span class="total-val expense">${fmt(expenseTotal)}</span>
						</div>
					{/if}

				<!-- ── Savings ─────────────────────────────────────────────────────── -->
				{:else if open === 'savings'}
					{#if savingsAccounts.length === 0 && investTotal === 0}
						<p class="empty">No savings or investment accounts found.</p>
					{:else}
						{#if savingsAccounts.length > 0}
							<p class="section-label">Savings Accounts</p>
							<table class="detail-table">
								<thead>
									<tr>
										<th>Account</th>
										<th>Institution</th>
										<th>Type</th>
										<th class="num">Balance</th>
									</tr>
								</thead>
								<tbody>
									{#each savingsAccounts as acct}
										<tr>
											<td>{String(acct.name ?? '—')}</td>
											<td class="muted">{String(acct.institution_name ?? '—')}</td>
											<td><span class="type-chip">{String(acct.subtype ?? '—')}</span></td>
											<td class="num amount">${fmt((acct.balance as number) ?? 0)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
						{#if investTotal > 0}
							<p class="section-label" style="margin-top:1rem">Investments</p>
							<div class="invest-row">
								<span>Total Portfolio Value</span>
								<span class="amount">${fmt(investTotal)}</span>
							</div>
						{/if}
						<div class="total-row">
							<span>Total Savings &amp; Investments</span>
							<span class="total-val">${fmt(savingsGrandTotal)}</span>
						</div>
					{/if}
				{/if}

			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background: rgba(10, 8, 30, 0.55);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal-panel {
		background: var(--bg-card);
		border-radius: 1.25rem;
		border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
		box-shadow: 0 24px 64px rgba(0,0,0,0.4);
		width: 100%;
		max-width: 640px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.1rem 1.4rem 0.9rem;
		border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
		flex-shrink: 0;
	}

	.modal-header h2 {
		font-size: 1.05rem;
		font-weight: 700;
		margin: 0;
		color: var(--text-primary);
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1rem;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.25rem 0.4rem;
		border-radius: var(--radius-sm, 6px);
		line-height: 1;
	}
	.close-btn:hover { color: var(--text-primary); background: var(--bg-surface); }

	.modal-body {
		overflow-y: auto;
		padding: 1.1rem 1.4rem 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.empty {
		color: var(--text-muted);
		font-size: 0.9rem;
		text-align: center;
		padding: 2rem 0;
		margin: 0;
	}

	/* ── Table ── */
	.detail-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.detail-table thead th {
		text-align: left;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0 0.5rem 0.5rem;
		border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
	}
	.detail-table thead th.num { text-align: right; }
	.detail-table tbody tr:hover td { background: var(--bg-surface); }
	.detail-table tbody td {
		padding: 0.5rem;
		color: var(--text-primary);
		border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.04));
		vertical-align: middle;
	}
	.detail-table tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
	.muted { color: var(--text-muted) !important; font-size: 0.82rem; }
	.amount { font-weight: 600; }
	.amount.income { color: #45c786; }
	.amount.expense { color: #ff6b8b; }

	/* ── Type chip ── */
	.type-chip {
		font-size: 0.72rem;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		background: var(--bg-surface);
		color: var(--text-muted);
		text-transform: capitalize;
		white-space: nowrap;
	}

	/* ── Category list (expense) ── */
	.cat-list { display: flex; flex-direction: column; gap: 0.75rem; }
	.cat-row { display: flex; flex-direction: column; gap: 0.3rem; }
	.cat-label-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}
	.cat-dot {
		width: 10px; height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.cat-name { flex: 1; color: var(--text-primary); }
	.cat-pct { font-size: 0.78rem; }
	.cat-amt { font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; }
	.progress-track {
		height: 5px;
		background: var(--bg-surface);
		border-radius: 999px;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 0.3s ease;
	}

	/* ── Invest row ── */
	.invest-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
		padding: 0.5rem;
		background: var(--bg-surface);
		border-radius: var(--radius-sm, 8px);
	}
	.invest-row .amount { color: var(--text-primary); }

	/* ── Section label ── */
	.section-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0;
	}

	/* ── Total row ── */
	.total-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.65rem 0.5rem 0;
		border-top: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-top: 0.25rem;
	}
	.total-val { font-size: 1rem; }
	.total-val.income { color: #45c786; }
	.total-val.expense { color: #ff6b8b; }
</style>

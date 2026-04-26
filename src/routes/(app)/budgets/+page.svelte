<script lang="ts">
	import PlaidLinkButton from '$lib/components/features/PlaidLinkButton.svelte';
	import Goals from '$lib/components/features/Goals.svelte';
	import TransactionsModal from '$lib/components/features/TransactionsModal.svelte';
	import StatDetailModal from '$lib/components/features/StatDetailModal.svelte';

	// ── Category colour map ───────────────────────────────────────────────────────
	const CAT_COLORS: Record<string, string> = {
		'Food and Drink':   '#ff6b8b',
		'Food':             '#ff6b8b',
		'Travel':           '#f4a836',
		'Transportation':   '#f4a836',
		'Service':          '#7c6bff',
		'Entertainment':    '#7c6bff',
		'Shops':            '#45c786',
		'Shopping':         '#45c786',
		'Recreation':       '#4bbaff',
		'Healthcare':       '#e8875a',
		'Transfer':         '#a0a0c0',
		'Other':            '#c0b0e0',
	};

	function catColor(cat: string): string {
		for (const key of Object.keys(CAT_COLORS)) {
			if (cat.toLowerCase().includes(key.toLowerCase())) return CAT_COLORS[key];
		}
		return '#c0b0e0';
	}

	// ── Data ─────────────────────────────────────────────────────────────────────
	let netWorthData  = $state<Record<string, unknown> | null>(null);
	let budgetData    = $state<Record<string, unknown> | null>(null);
	let txnData       = $state<Record<string, unknown> | null>(null);
	let recurringData = $state<Record<string, unknown> | null>(null);
	let investData    = $state<Record<string, unknown> | null>(null);
	let liabData      = $state<Record<string, unknown> | null>(null);
	let moneyFlowData = $state<Record<string, unknown> | null>(null);
	let loading       = $state(true);
	let noAccounts    = $state(false);

	// ── Filter + modal state ────────────────────────────────────────────────────
	let flowPeriod = $state<'year' | '6months'>('year');
	let flowAccount = $state('');
	let txnAccountFilter = $state('');
	let txnModalOpen = $state(false);
	let detailStat = $state<'balance' | 'income' | 'expense' | 'savings' | null>(null);

	// ── Chart hover state ────────────────────────────────────────────────────────
	let hoveredBar = $state<{ month: string; value: number; type: string; x: number; y: number } | null>(null);

	async function loadAll() {
		loading = true;
		noAccounts = false;
		try {
			const [nwRes, budRes, txnRes, recRes, invRes, liabRes, mfRes] = await Promise.all([
				fetch('/api/plaid/net-worth'),
				fetch('/api/plaid/budget'),
				fetch('/api/plaid/transactions'),
				fetch('/api/plaid/recurring'),
				fetch('/api/plaid/investments'),
				fetch('/api/plaid/liabilities'),
				fetch('/api/plaid/money-flow'),
			]);
			if (nwRes.ok)   netWorthData  = await nwRes.json();
			if (budRes.ok)  budgetData    = await budRes.json();
			if (txnRes.ok)  txnData       = await txnRes.json();
			if (recRes.ok)  recurringData = await recRes.json();
			if (invRes.ok)  investData    = await invRes.json();
			if (liabRes.ok) liabData      = await liabRes.json();
			if (mfRes.ok)   moneyFlowData = await mfRes.json();

			if (netWorthData && (netWorthData.institutions as unknown[])?.length === 0) {
				noAccounts = true;
			}
		} catch {
			// partial data is fine — each section handles nulls
		} finally {
			loading = false;
		}
	}

	$effect(() => { void loadAll(); });

	// ── Helpers ──────────────────────────────────────────────────────────────────
	function fmt(n: number, currency = true) {
		const abs = Math.abs(n);
		const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		return currency ? `$${str}` : str;
	}
	function fmtWhole(n: number): string {
		return Math.floor(Math.abs(n)).toLocaleString('en-US');
	}
	function fmtCents(n: number): string {
		const parts = Math.abs(n).toFixed(2).split('.');
		return `.${parts[1]}`;
	}
	function fmtShort(n: number) {
		if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
		if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
		return fmt(n);
	}
	function fmtDate(s: string) {
		return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
	function fmtDateFull(s: string) {
		return new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	}

	// ── Stat card derivations ────────────────────────────────────────────────────
	let totalBalance = $derived.by(() => {
		const accounts = (netWorthData?.accounts as Array<Record<string, unknown>>) ?? [];
		return accounts.reduce((s, a) => s + ((a.balance as number) ?? 0), 0);
	});

	let monthlyIncome = $derived.by(() => {
		const inflows = (recurringData?.inflow_streams as Array<Record<string, unknown>>) ?? [];
		const freqMultiplier: Record<string, number> = {
			WEEKLY:       4.33,
			BIWEEKLY:     2.17,
			SEMI_MONTHLY: 2,
			MONTHLY:      1,
			QUARTERLY:    1 / 3,
			ANNUALLY:     1 / 12,
		};
		return inflows.reduce((s, f) => {
			const amt = Math.abs((f.average_amount as Record<string, number>)?.amount ?? 0);
			const freq = String(f.frequency ?? '');
			const multiplier = freqMultiplier[freq] ?? 1;
			return s + amt * multiplier;
		}, 0);
	});

	let budgetSpent = $derived((budgetData?.spent as number) ?? 0);
	let budgetTotal = $derived((budgetData?.total as number) ?? 6000);
	let budgetPct   = $derived(Math.min(100, (budgetSpent / budgetTotal) * 100));

	let totalSavings = $derived.by(() => {
		const accounts = (netWorthData?.accounts as Array<Record<string, unknown>>) ?? [];
		const savingsTypes = ['savings', 'cd', 'money market'];
		return accounts
			.filter(a => savingsTypes.includes(String(a.subtype ?? '').toLowerCase()))
			.reduce((s, a) => s + ((a.balance as number) ?? 0), 0)
			+ ((investData?.total_value as number) ?? 0);
	});

	let incomeChangePct  = $derived((moneyFlowData?.income_change_pct as number) ?? 0);
	let expenseChangePct = $derived((moneyFlowData?.expense_change_pct as number) ?? 0);

	// ── Spending by category (from transactions) ──────────────────────────────────
	let spendingByCategory = $derived.by(() => {
		const txns = ((txnData?.added as Array<Record<string, unknown>>) ?? [])
			.filter(t => !t.error && t.amount != null && (t.amount as number) > 0);
		const map = new Map<string, number>();
		for (const t of txns) {
			const cat = String(t.category_primary ?? 'Other');
			map.set(cat, (map.get(cat) ?? 0) + (t.amount as number));
		}
		const entries = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
		const total = entries.reduce((s, [, v]) => s + v, 0);
		return entries.map(([name, amount]) => ({
			name,
			amount,
			pct: total > 0 ? (amount / total) * 100 : 0,
			color: catColor(name),
		}));
	});

	// ── Donut gradient (conic-gradient) ──────────────────────────────────────────
	let donutGradient = $derived.by(() => {
		if (!spendingByCategory.length) return 'conic-gradient(var(--bg-surface) 0% 100%)';
		let cursor = 0;
		const stops = spendingByCategory.map(({ pct, color }) => {
			const start = cursor;
			cursor += pct;
			return `${color} ${start.toFixed(1)}% ${cursor.toFixed(1)}%`;
		});
		return `conic-gradient(${stops.join(', ')})`;
	});

	// ── Institutions list (for dropdowns) ───────────────────────────────────────
	let institutionsList = $derived.by(() => {
		const insts = (netWorthData?.institutions as Array<Record<string, unknown>>) ?? [];
		return insts.map(i => String(i.institution_name ?? '')).filter(Boolean);
	});

	// ── Money flow chart ─────────────────────────────────────────────────────────
	let flowMonths = $derived.by(() => {
		return ((moneyFlowData?.months as Array<Record<string, unknown>>) ?? []);
	});

	let filteredFlowMonths = $derived.by(() => {
		const currentYear = new Date().getFullYear();
		if (flowPeriod === '6months') return flowMonths.slice(-6);
		return flowMonths.filter(m => (m.year as number) === currentYear);
	});

	let chartMax = $derived.by(() => {
		if (!filteredFlowMonths.length) return 15000;
		const max = Math.max(...filteredFlowMonths.map(m => Math.max((m.income as number) ?? 0, (m.expense as number) ?? 0)));
		return Math.ceil(max / 5000) * 5000 || 15000;
	});

	// ── Re-fetch money flow when account filter changes ───────────────────────────
	$effect(() => {
		const account = flowAccount;
		const controller = new AbortController();
		const params = new URLSearchParams({ months: '12' });
		if (account) params.set('institution', account);
		fetch(`/api/plaid/money-flow?${params}`, { signal: controller.signal })
			.then(async (res) => { if (res.ok) moneyFlowData = await res.json(); })
			.catch((e: unknown) => { if ((e as { name?: string }).name === 'AbortError') return; });
		return () => controller.abort();
	});

	// ── Recent transactions (top 8, filtered by account) ─────────────────────────
	let txnInstitutions = $derived.by(() => {
		const txns = (txnData?.added as Array<Record<string, unknown>>) ?? [];
		return [...new Set<string>(txns.map(t => String(t.institution_name ?? '')).filter(Boolean))];
	});

	let recentTxns = $derived.by(() =>
		((txnData?.added as Array<Record<string, unknown>>) ?? [])
			.filter(t => !t.error && t.date && t.amount != null)
			.filter(t => !txnAccountFilter || t.institution_name === txnAccountFilter)
			.slice(0, 8)
	);
</script>

<div class="fin-page" data-testid="budgets-page">

	<!-- ── Header ─────────────────────────────────────────────────────────────── -->
	<header class="fin-header">
		<div class="header-left">
			<h1>Finance Overview</h1>
			<p>It is the best time to manage your finances</p>
		</div>
		<div class="header-right">
			<span class="month-chip">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
				This month
			</span>
			<PlaidLinkButton onLinked={loadAll} />
		</div>
	</header>

	{#if loading}
		<div class="skeleton-grid">
			{#each Array(4) as _}
				<div class="skeleton-card glass"></div>
			{/each}
		</div>
		<div class="loading-hint">Loading your financial data…</div>

	{:else if noAccounts}
		<div class="empty-full glass">
			<div class="empty-icon">🏦</div>
			<h2>No linked accounts yet</h2>
			<p>Connect your bank to see your full financial picture.</p>
			<PlaidLinkButton onLinked={loadAll} />
		</div>

	{:else}

		<!-- ── Stat cards ──────────────────────────────────────────────────────── -->
		<div class="stat-grid">
			<div class="stat-card glass">
				<div class="stat-top">
					<span class="stat-label">Total balance</span>
					<span class="stat-arrow-icon" onclick={() => detailStat = 'balance'} role="button" tabindex="0" aria-label="View balance details">↗</span>
				</div>
				<div class="stat-value">
					<span class="stat-dollars">${fmtWhole(totalBalance)}</span><span class="stat-cents">{fmtCents(totalBalance)}</span>
				</div>
				<div class="stat-change" class:positive={incomeChangePct >= 0} class:negative={incomeChangePct < 0}>
					<span class="change-indicator">{incomeChangePct >= 0 ? '↑' : '↓'} {Math.abs(incomeChangePct).toFixed(1)}%</span>
					<span class="change-vs">vs last month</span>
				</div>
			</div>

			<div class="stat-card glass">
				<div class="stat-top">
					<span class="stat-label">Income</span>
					<span class="stat-arrow-icon" onclick={() => detailStat = 'income'} role="button" tabindex="0" aria-label="View income details">↗</span>
				</div>
				<div class="stat-value">
					<span class="stat-dollars">${fmtWhole(monthlyIncome)}</span><span class="stat-cents">{fmtCents(monthlyIncome)}</span>
				</div>
				<div class="stat-change" class:positive={incomeChangePct >= 0} class:negative={incomeChangePct < 0}>
					<span class="change-indicator">{incomeChangePct >= 0 ? '↑' : '↓'} {Math.abs(incomeChangePct).toFixed(1)}%</span>
					<span class="change-vs">vs last month</span>
				</div>
			</div>

			<div class="stat-card glass">
				<div class="stat-top">
					<span class="stat-label">Expense</span>
					<span class="stat-arrow-icon" onclick={() => detailStat = 'expense'} role="button" tabindex="0" aria-label="View expense details">↗</span>
				</div>
				<div class="stat-value">
					<span class="stat-dollars">${fmtWhole(budgetSpent)}</span><span class="stat-cents">{fmtCents(budgetSpent)}</span>
				</div>
				<div class="stat-change" class:positive={expenseChangePct <= 0} class:negative={expenseChangePct > 0}>
					<span class="change-indicator">{expenseChangePct > 0 ? '↑' : '↓'} {Math.abs(expenseChangePct).toFixed(1)}%</span>
					<span class="change-vs">vs last month</span>
				</div>
			</div>

			<div class="stat-card glass">
				<div class="stat-top">
					<span class="stat-label">Total savings</span>
					<span class="stat-arrow-icon" onclick={() => detailStat = 'savings'} role="button" tabindex="0" aria-label="View savings details">↗</span>
				</div>
				<div class="stat-value">
					<span class="stat-dollars">${fmtWhole(totalSavings)}</span><span class="stat-cents">{fmtCents(totalSavings)}</span>
				</div>
			</div>
		</div>

		<!-- ── Middle row: Money Flow + Budget Donut ───────────────────────────── -->
		<div class="mid-grid">

			<!-- Money flow bar chart -->
			<div class="card glass chart-card">
				<div class="card-header">
					<h2>Money flow</h2>
					<div class="chart-controls">
						<div class="chart-legend">
							<span class="legend-pill"><span class="legend-swatch income-swatch"></span> Income</span>
							<span class="legend-pill"><span class="legend-swatch expense-swatch"></span> Expense</span>
						</div>
						<select class="filter-select" bind:value={flowAccount}>
							<option value="">All accounts</option>
							{#each institutionsList as inst}
								<option value={inst}>{inst}</option>
							{/each}
						</select>
						<select class="filter-select" bind:value={flowPeriod}>
							<option value="year">This year</option>
							<option value="6months">Last 6 months</option>
						</select>
					</div>
				</div>

				{#if filteredFlowMonths.length === 0}
					<p class="empty-note">No transaction history available.</p>
				{:else}
					<div class="chart-wrap">
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" class="bar-chart" onmouseleave={() => hoveredBar = null}>
							<!-- Y‑axis gridlines + labels -->
							{#each Array(6) as _, i}
								{@const yVal = chartMax - (chartMax / 5) * i}
								{@const yPos = 20 + (240 / 5) * i}
								<line x1="55" y1={yPos} x2="690" y2={yPos} class="grid-line" />
								<text x="48" y={yPos + 4} text-anchor="end" class="axis-label">
									{yVal === 0 ? '$0' : `$${(yVal / 1000).toLocaleString('en-US', {maximumFractionDigits: 0})}K`}
								</text>
							{/each}
							<line x1="55" y1="260" x2="690" y2="260" class="grid-line" />
							<text x="48" y="264" text-anchor="end" class="axis-label">$0</text>

							<!-- Bars per month -->
							{#each filteredFlowMonths as m, idx}
								{@const groupW = 635 / filteredFlowMonths.length}
								{@const gx = 55 + groupW * idx}
								{@const barW = Math.min(30, groupW * 0.34)}
								{@const gap = 4}
								{@const inc = (m.income as number) ?? 0}
								{@const exp = (m.expense as number) ?? 0}
								{@const incH = chartMax > 0 ? (inc / chartMax) * 240 : 0}
								{@const expH = chartMax > 0 ? (exp / chartMax) * 240 : 0}
								{@const b1x = gx + (groupW - barW * 2 - gap) / 2}
								{@const b2x = b1x + barW + gap}

								<!-- Income bar -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<rect
									x={b1x} y={260 - incH} width={barW} height={Math.max(incH, 0)}
									rx="4" class="bar bar-income"
									onmouseenter={() => hoveredBar = { month: m.month as string, value: inc, type: 'Income', x: b1x + barW / 2, y: 260 - incH - 10 }}
								/>
								<!-- Expense bar -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<rect
									x={b2x} y={260 - expH} width={barW} height={Math.max(expH, 0)}
									rx="4" class="bar bar-expense"
									onmouseenter={() => hoveredBar = { month: m.month as string, value: exp, type: 'Expense', x: b2x + barW / 2, y: 260 - expH - 10 }}
								/>

								<!-- Permanent value label on the tallest bar of the middle month -->
								{#if idx === Math.floor(filteredFlowMonths.length / 2) && inc > 0}
									<g class="bar-label-group">
										<rect x={b1x - 6} y={260 - incH - 28} width={barW + 16} height="22" rx="6" fill="var(--text-primary)" />
										<text x={b1x + barW / 2 + 2} y={260 - incH - 13} text-anchor="middle" fill="#fff" font-size="10.5" font-weight="700">
											${(inc / 1000).toLocaleString('en-US', {maximumFractionDigits: 0})}K
										</text>
									</g>
								{/if}

								<!-- X-axis month label -->
								<text x={gx + groupW / 2} y="282" text-anchor="middle" class="axis-label month-label">
									{m.month as string}
								</text>
							{/each}

							<!-- Hover tooltip -->
							{#if hoveredBar}
								<g class="hover-tooltip" style="pointer-events:none">
									<rect x={hoveredBar.x - 38} y={hoveredBar.y - 24} width="76" height="22" rx="6" fill="var(--text-primary)" opacity="0.92" />
									<text x={hoveredBar.x} y={hoveredBar.y - 9} text-anchor="middle" fill="#fff" font-size="11" font-weight="600">
										${hoveredBar.value.toLocaleString()}
									</text>
								</g>
							{/if}
						</svg>
					</div>
				{/if}
			</div>

			<!-- Budget donut -->
			<div class="card glass donut-card">
				<div class="card-header">
					<h2>Budget</h2>
					<span class="stat-arrow-icon sm" onclick={() => detailStat = 'expense'} role="button" tabindex="0" aria-label="View expense details">↗</span>
				</div>
				<div class="donut-layout">
					<div class="donut-legend">
						{#each spendingByCategory as cat}
							<div class="legend-row">
								<span class="legend-dot" style="background:{cat.color}"></span>
								<span class="legend-name">{cat.name}</span>
							</div>
						{/each}
						{#if spendingByCategory.length === 0}
							<p class="empty-note">No data</p>
						{/if}
					</div>
					<div class="donut-side">
						<div class="donut" style="background:{donutGradient}">
							<div class="donut-inner">
								<span class="donut-sub">Total for month</span>
								<span class="donut-value">${fmtWhole(budgetSpent)}</span>
								<span class="donut-cents">{fmtCents(budgetSpent)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ── Bottom row: Transactions + Goals ────────────────────────────────── -->
		<div class="bottom-grid">

			<!-- Recent transactions -->
			<div class="card glass txn-card">
				<div class="card-header">
					<h2>Recent transactions</h2>
					<div class="txn-controls">
						<select class="filter-select" bind:value={txnAccountFilter}>
							<option value="">All accounts</option>
							{#each txnInstitutions as inst}
								<option value={inst}>{inst}</option>
							{/each}
						</select>
						<button class="see-all-btn" onclick={() => (txnModalOpen = true)}>See all <span class="see-arrow">›</span></button>
					</div>
				</div>
				{#if recentTxns.length === 0}
					<p class="empty-note">No transactions found.</p>
				{:else}
					<div class="txn-table-wrap">
						<table class="txn-table">
							<thead>
								<tr>
									<th>Date</th>
									<th class="num">Amount</th>
									<th>Payment Name</th>
									<th>Method</th>
									<th>Category</th>
								</tr>
							</thead>
							<tbody>
								{#each recentTxns as txn}
									<tr>
										<td class="txn-date-cell">{fmtDateFull(txn.date as string)}</td>
										<td class="num txn-amt" class:income={(txn.amount as number) < 0} class:expense={(txn.amount as number) >= 0}>
											{(txn.amount as number) < 0 ? '+' : '-'} ${fmt(Math.abs(txn.amount as number), false)}
										</td>
										<td>
											<div class="txn-merchant">
												<span class="merchant-icon" style="background:{catColor(String(txn.category_primary ?? ''))}22;color:{catColor(String(txn.category_primary ?? ''))}">
													{String(txn.name ?? '?')[0].toUpperCase()}
												</span>
												<span class="merchant-name">{txn.name as string}</span>
												{#if txn.pending}<span class="pending-dot" title="Pending"></span>{/if}
											</div>
										</td>
										<td class="txn-method">
											<span class="method-text">{txn.institution_name ? (txn.institution_name as string) : '—'}</span>
										</td>
										<td>
											{#if txn.category_primary}
												<span class="cat-chip" style="background:{catColor(String(txn.category_primary))}22;color:{catColor(String(txn.category_primary))}">
													{txn.category_primary as string}
												</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<!-- Saving goals -->
			<div class="goals-wrap">
				<Goals />
			</div>
		</div>

	{/if}
</div>

<TransactionsModal bind:open={txnModalOpen} />
<StatDetailModal
	bind:open={detailStat}
	{netWorthData}
	{recurringData}
	{txnData}
	{investData}
	{spendingByCategory}
/>

<style>
	/* ── Page shell ─────────────────────────────────────────────────────────── */
	.fin-page {
		height: 100%;
		overflow-y: auto;
		padding: 1.5rem 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		scrollbar-width: thin;
		scrollbar-color: var(--bg-surface) transparent;
	}

	/* ── Header ─────────────────────────────────────────────────────────────── */
	.fin-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.fin-header h1 {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
		line-height: 1.2;
	}

	.fin-header p {
		font-size: 0.82rem;
		color: var(--text-muted);
		margin: 0.15rem 0 0;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.month-chip {
		background: var(--bg-glass);
		border: 1px solid var(--bg-glass-border);
		border-radius: var(--radius-sm);
		padding: 0.35rem 0.85rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-secondary);
		backdrop-filter: var(--blur-glass);
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	/* ── Stat cards ─────────────────────────────────────────────────────────── */
	.stat-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	@media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
	@media (max-width: 650px)  { .stat-grid { grid-template-columns: 1fr; } }

	.stat-card {
		border-radius: var(--radius-md);
		padding: 1.2rem 1.25rem 1rem;
		box-shadow: var(--shadow-card);
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		position: relative;
		overflow: hidden;
		border: 1px solid var(--bg-glass-border);
	}

	.stat-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.stat-label {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.stat-arrow-icon {
		width: 1.8rem;
		height: 1.8rem;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: 700;
		background: var(--bg-surface);
		color: var(--text-muted);
		cursor: pointer;
		transition: background 0.2s;
	}

	.stat-arrow-icon:hover {
		background: var(--accent-primary-soft);
		color: var(--accent-primary);
	}

	.stat-arrow-icon.sm {
		width: 1.5rem;
		height: 1.5rem;
		font-size: 0.7rem;
	}

	.stat-value {
		display: flex;
		align-items: baseline;
		margin: 0.15rem 0;
	}

	.stat-dollars {
		font-size: 1.65rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
	}

	.stat-cents {
		font-size: 1rem;
		font-weight: 500;
		color: var(--text-muted);
		line-height: 1;
	}

	.stat-change {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
	}

	.change-indicator {
		font-weight: 700;
	}

	.stat-change.positive .change-indicator { color: #45c786; }
	.stat-change.negative .change-indicator { color: var(--accent-primary); }

	.change-vs {
		color: var(--text-muted);
	}

	/* ── Shared card ────────────────────────────────────────────────────────── */
	.card {
		border-radius: var(--radius-md);
		padding: 1.25rem;
		box-shadow: var(--shadow-card);
		border: 1px solid var(--bg-glass-border);
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
		gap: 0.75rem;
	}

	.card-header h2 {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		white-space: nowrap;
	}

	.empty-note {
		font-size: 0.82rem;
		color: var(--text-muted);
		text-align: center;
		padding: 0.75rem 0;
	}

	/* ── Filter selects ─────────────────────────────────────────────────────── */
	.filter-select {
		background: var(--bg-surface);
		border: 1px solid var(--bg-glass-border);
		border-radius: var(--radius-sm);
		padding: 0.3rem 0.6rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		cursor: pointer;
		appearance: auto;
	}

	/* ── Mid grid (Money Flow + Donut) ──────────────────────────────────────── */
	.mid-grid {
		display: grid;
		grid-template-columns: 1fr 340px;
		gap: 1rem;
		align-items: stretch;
	}

	@media (max-width: 1050px) { .mid-grid { grid-template-columns: 1fr; } }

	/* ── Money Flow chart ───────────────────────────────────────────────────── */
	.chart-card {
		min-height: 340px;
		display: flex;
		flex-direction: column;
	}

	.chart-controls {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		flex-wrap: wrap;
	}

	.chart-legend {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.legend-pill {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.legend-swatch {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.income-swatch  { background: #7c6bff; }
	.expense-swatch { background: #c4b8ff; }

	.chart-wrap {
		flex: 1;
		min-height: 0;
	}

	.bar-chart {
		width: 100%;
		height: 100%;
		min-height: 240px;
	}

	.bar-chart .grid-line {
		stroke: var(--bg-surface);
		stroke-width: 1;
	}

	.bar-chart .axis-label {
		fill: var(--text-muted);
		font-size: 11px;
		font-weight: 500;
	}

	.bar-chart .month-label {
		font-size: 12px;
		font-weight: 600;
	}

	.bar {
		transition: opacity 0.15s;
		cursor: pointer;
	}

	.bar:hover { opacity: 0.8; }

	.bar-income  { fill: #7c6bff; }
	.bar-expense { fill: #c4b8ff; }

	.bar-label-group text,
	.hover-tooltip text {
		pointer-events: none;
	}

	/* ── Budget donut card ──────────────────────────────────────────────────── */
	.donut-card {
		display: flex;
		flex-direction: column;
	}

	.donut-layout {
		flex: 1;
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.donut-legend {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}

	.legend-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.legend-name {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.donut-side {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.donut {
		width: 140px;
		height: 140px;
		border-radius: 50%;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.donut-inner {
		width: 90px;
		height: 90px;
		border-radius: 50%;
		background: var(--bg-glass);
		backdrop-filter: var(--blur-glass);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.donut-sub {
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		font-weight: 600;
	}

	.donut-value {
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.donut-cents {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-weight: 500;
		margin-top: -0.1rem;
	}

	/* ── Bottom grid (Transactions + Goals) ─────────────────────────────────── */
	.bottom-grid {
		display: grid;
		grid-template-columns: 1fr 340px;
		gap: 1rem;
		align-items: start;
	}

	@media (max-width: 1050px) { .bottom-grid { grid-template-columns: 1fr; } }

	/* ── Transactions card ──────────────────────────────────────────────────── */
	.txn-controls {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.see-all-btn {
		background: none;
		border: 1px solid var(--bg-glass-border);
		border-radius: var(--radius-sm);
		padding: 0.3rem 0.7rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		transition: border-color 0.2s, color 0.2s;
	}

	.see-all-btn:hover {
		border-color: var(--accent-primary);
		color: var(--accent-primary);
	}

	.see-arrow {
		font-size: 1rem;
		line-height: 1;
	}

	.txn-table-wrap { overflow-x: auto; }

	.txn-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.txn-table th {
		text-align: left;
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--accent-primary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.3rem 0.6rem 0.6rem;
		border-bottom: 1px solid var(--bg-surface);
	}

	.txn-table td {
		padding: 0.65rem 0.6rem;
		border-bottom: 1px solid var(--bg-surface);
		vertical-align: middle;
	}

	.txn-table tr:last-child td { border-bottom: none; }
	.txn-table .num { text-align: right; }

	.txn-date-cell {
		color: var(--text-muted);
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.txn-merchant {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}

	.merchant-icon {
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 800;
		flex-shrink: 0;
	}

	.merchant-name {
		font-weight: 600;
		color: var(--text-primary);
	}

	.pending-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent-secondary);
		flex-shrink: 0;
	}

	.txn-method .method-text {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.cat-chip {
		border-radius: 999px;
		padding: 0.15rem 0.55rem;
		font-size: 0.7rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.txn-amt {
		font-weight: 700;
		font-size: 0.88rem;
		white-space: nowrap;
	}

	.txn-amt.income  { color: #45c786; }
	.txn-amt.expense { color: var(--accent-primary); }

	/* ── Goals wrapper ──────────────────────────────────────────────────────── */
	.goals-wrap {
		min-height: 0;
	}

	.goals-wrap > :global(section) {
		height: 100%;
	}

	/* ── Skeleton / loading ─────────────────────────────────────────────────── */
	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.skeleton-card {
		border-radius: var(--radius-md);
		height: 100px;
		animation: shimmer 1.4s infinite ease-in-out;
	}

	@keyframes shimmer {
		0%,100% { opacity: 0.5; }
		50%      { opacity: 1; }
	}

	.loading-hint {
		text-align: center;
		font-size: 0.85rem;
		color: var(--text-muted);
		margin-top: 0.5rem;
	}

	/* ── Empty state ────────────────────────────────────────────────────────── */
	.empty-full {
		border-radius: var(--radius-lg);
		padding: 3rem 2rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		box-shadow: var(--shadow-card);
	}

	.empty-icon { font-size: 2.5rem; }
	.empty-full h2 { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); }
	.empty-full p  { font-size: 0.88rem; color: var(--text-muted); }
</style>

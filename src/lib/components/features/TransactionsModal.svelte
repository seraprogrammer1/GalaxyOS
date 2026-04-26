<script lang="ts">
	const CAT_COLORS: Record<string, string> = {
		'Food and Drink': '#ff6b8b',
		'Food': '#ff6b8b',
		'Travel': '#f4a836',
		'Transportation': '#f4a836',
		'Service': '#7c6bff',
		'Entertainment': '#7c6bff',
		'Shops': '#45c786',
		'Shopping': '#45c786',
		'Recreation': '#4bbaff',
		'Healthcare': '#e8875a',
		'Transfer': '#a0a0c0',
		'Other': '#c0b0e0',
	};
	const CATEGORY_KEYS = Object.keys(CAT_COLORS).filter((k, i, arr) => arr.indexOf(k) === i);

	function catColor(cat: string): string {
		for (const key of Object.keys(CAT_COLORS)) {
			if (cat.toLowerCase().includes(key.toLowerCase())) return CAT_COLORS[key];
		}
		return '#c0b0e0';
	}
	function fmt(n: number): string {
		return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}
	function fmtDate(s: string): string {
		return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props { open: boolean }
	let { open = $bindable(false) }: Props = $props();

	// ── State ─────────────────────────────────────────────────────────────────
	type Txn = Record<string, unknown>;

	let search = $state('');
	let categoryFilter = $state('');
	let institutionFilter = $state('');

	let transactions = $state<Txn[]>([]);
	let total = $state(0);
	let page = $state(0);
	let loading = $state(false);
	let institutions = $state<string[]>([]);

	const PAGE_SIZE = 50;
	let hasMore = $derived(transactions.length < total);

	// ── Debounce search ────────────────────────────────────────────────────────
	let searchDebounced = $state('');
	let debounceTimer: ReturnType<typeof setTimeout>;
	$effect(() => {
		clearTimeout(debounceTimer);
		const val = search;
		debounceTimer = setTimeout(() => { searchDebounced = val; }, 300);
		return () => clearTimeout(debounceTimer);
	});

	// ── Fetch on filter/open changes ──────────────────────────────────────────
	$effect(() => {
		if (!open) { transactions = []; total = 0; page = 0; return; }

		// Track reactive deps
		const s = searchDebounced;
		const cat = categoryFilter;
		const inst = institutionFilter;

		const controller = new AbortController();
		loading = true;
		transactions = [];
		total = 0;
		page = 0;

		const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: '0' });
		if (cat) params.set('category', cat);
		if (inst) params.set('institution', inst);
		if (s) params.set('search', s);

		fetch(`/api/plaid/transactions?${params}`, { signal: controller.signal })
			.then(async (res) => {
				if (!res.ok) return;
				const data = await res.json();
				transactions = data.added ?? [];
				total = data.total ?? 0;
				// Collect unique institutions for the dropdown
				const insts = [...new Set<string>(
					(data.added as Txn[])
						.map((t) => t.institution_name as string)
						.filter(Boolean)
				)];
				if (insts.length) institutions = insts;
			})
			.catch((e: unknown) => { if ((e as { name?: string }).name === 'AbortError') return; })
			.finally(() => { loading = false; });

		return () => controller.abort();
	});

	// ── Load more (append next page) ──────────────────────────────────────────
	async function loadMore() {
		if (loading || !hasMore) return;
		const nextPage = page + 1;
		loading = true;

		const params = new URLSearchParams({
			limit: String(PAGE_SIZE),
			offset: String(nextPage * PAGE_SIZE)
		});
		if (categoryFilter) params.set('category', categoryFilter);
		if (institutionFilter) params.set('institution', institutionFilter);
		if (searchDebounced) params.set('search', searchDebounced);

		try {
			const res = await fetch(`/api/plaid/transactions?${params}`);
			if (res.ok) {
				const data = await res.json();
				transactions = [...transactions, ...(data.added ?? [])];
				total = data.total ?? total;
				page = nextPage;
			}
		} finally {
			loading = false;
		}
	}

	// ── Keyboard close ────────────────────────────────────────────────────────
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-panel glass" onclick={(e) => e.stopPropagation()}>

			<!-- Header -->
			<div class="modal-header">
				<h2>All Transactions</h2>
				<button class="close-btn" onclick={() => (open = false)} aria-label="Close">✕</button>
			</div>

			<!-- Filters -->
			<div class="filter-bar">
				<input
					class="search-input"
					type="search"
					placeholder="Search by name…"
					bind:value={search}
				/>
				<select class="filter-select" bind:value={categoryFilter}>
					<option value="">All categories</option>
					{#each CATEGORY_KEYS as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
				<select class="filter-select" bind:value={institutionFilter}>
					<option value="">All accounts</option>
					{#each institutions as inst}
						<option value={inst}>{inst}</option>
					{/each}
				</select>
			</div>

			<!-- Table -->
			<div class="table-wrap">
				{#if loading && transactions.length === 0}
					<div class="loading-row">Loading…</div>
				{:else if transactions.length === 0}
					<div class="empty-row">No transactions match your filters.</div>
				{:else}
					<table class="txn-table">
						<thead>
							<tr>
								<th>Date</th>
								<th class="num">Amount</th>
								<th>Name</th>
								<th>Account</th>
								<th>Category</th>
							</tr>
						</thead>
						<tbody>
							{#each transactions as txn}
								<tr>
									<td class="txn-date">{fmtDate(txn.date as string)}</td>
									<td class="num txn-amt" class:income={(txn.amount as number) < 0} class:expense={(txn.amount as number) >= 0}>
										{(txn.amount as number) < 0 ? '+' : '-'}${fmt(txn.amount as number)}
									</td>
									<td>
										<div class="txn-merchant">
											<span
												class="merchant-icon"
												style="background:{catColor(String(txn.category_primary ?? ''))}22;color:{catColor(String(txn.category_primary ?? ''))}"
											>
												{String(txn.name ?? '?')[0].toUpperCase()}
											</span>
											<span class="merchant-name">{txn.name as string}</span>
											{#if txn.pending}<span class="pending-dot" title="Pending"></span>{/if}
										</div>
									</td>
									<td class="txn-method">{txn.institution_name ? (txn.institution_name as string) : '—'}</td>
									<td>
										{#if txn.category_primary}
											<span
												class="cat-chip"
												style="background:{catColor(String(txn.category_primary))}22;color:{catColor(String(txn.category_primary))}"
											>
												{txn.category_primary as string}
											</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>

			<!-- Footer -->
			<div class="modal-footer">
				<span class="count-label">Showing {transactions.length} of {total}</span>
				{#if hasMore}
					<button class="load-more-btn" onclick={loadMore} disabled={loading}>
						{loading ? 'Loading…' : 'Load more'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.modal-panel {
		width: 100%;
		max-width: 900px;
		max-height: 85vh;
		border-radius: 1.25rem;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--bg-card, #1a1a2e);
		border: 1px solid var(--border-subtle);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
	}

	/* Header */
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem 0.75rem;
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.modal-header h2 {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--text-muted, #888);
		font-size: 1.1rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 0.4rem;
		transition: color 0.15s, background 0.15s;
		line-height: 1;
	}
	.close-btn:hover {
		color: var(--text-primary);
		background: var(--bg-surface);
	}

	/* Filters */
	.filter-bar {
		display: flex;
		gap: 0.6rem;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	.search-input {
		flex: 1;
		min-width: 160px;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: 0.6rem;
		color: var(--text-primary);
		padding: 0.45rem 0.8rem;
		font-size: 0.82rem;
		outline: none;
		transition: border-color 0.15s;
	}
	.search-input:focus {
		border-color: var(--accent-primary);
	}
	.search-input::placeholder {
		color: var(--text-muted, #888);
	}

	.filter-select {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: 0.6rem;
		color: var(--text-primary);
		padding: 0.45rem 0.7rem;
		font-size: 0.82rem;
		cursor: pointer;
		outline: none;
	}
	.filter-select:focus {
		border-color: var(--accent-primary);
	}

	/* Table */
	.table-wrap {
		overflow-y: auto;
		flex: 1;
		padding: 0 0.25rem;
		scrollbar-width: thin;
		scrollbar-color: var(--accent-primary-soft, rgba(232, 116, 138, 0.3)) transparent;
	}
	.table-wrap::-webkit-scrollbar {
		width: 5px;
	}
	.table-wrap::-webkit-scrollbar-track {
		background: transparent;
	}
	.table-wrap::-webkit-scrollbar-thumb {
		background: var(--accent-primary-soft, rgba(232, 116, 138, 0.3));
		border-radius: 99px;
	}

	.loading-row,
	.empty-row {
		text-align: center;
		padding: 3rem;
		color: var(--text-muted, #888);
		font-size: 0.9rem;
	}

	.txn-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}

	.txn-table thead th {
		position: sticky;
		top: 0;
		background: var(--bg-card, #1a1a2e);
		padding: 0.6rem 1rem;
		text-align: left;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-muted, #888);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--border-subtle);
		white-space: nowrap;
		z-index: 1;
	}

	.txn-table tbody tr {
		border-bottom: 1px solid var(--border-subtle);
		transition: background 0.12s;
	}
	.txn-table tbody tr:hover {
		background: var(--bg-surface);
	}

	.txn-table td {
		padding: 0.6rem 1rem;
		color: var(--text-primary);
		vertical-align: middle;
		white-space: nowrap;
	}

	.txn-date { color: var(--text-muted, #888); font-size: 0.78rem; }

	.num { text-align: right; font-variant-numeric: tabular-nums; }
	.txn-amt { font-weight: 600; }
	.income { color: #45c786; }
	.expense { color: #ff6b8b; }

	.txn-merchant {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}
	.merchant-icon {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
	}
	.merchant-name {
		font-weight: 500;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pending-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #f4a836;
		flex-shrink: 0;
	}

	.txn-method { color: var(--text-muted, #888); font-size: 0.78rem; }

	.cat-chip {
		display: inline-block;
		padding: 0.2rem 0.55rem;
		border-radius: 1rem;
		font-size: 0.72rem;
		font-weight: 600;
		white-space: nowrap;
	}

	/* Footer */
	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.count-label {
		font-size: 0.78rem;
		color: var(--text-muted, #888);
	}

	.load-more-btn {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: 0.6rem;
		color: var(--text-primary);
		padding: 0.4rem 1rem;
		font-size: 0.82rem;
		cursor: pointer;
		transition: background 0.15s;
	}
	.load-more-btn:hover:not(:disabled) {
		background: var(--bg-glass);
	}
	.load-more-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>

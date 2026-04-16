<script lang="ts">
	import { untrack } from 'svelte';
	import PlaidLinkButton from './PlaidLinkButton.svelte';

	interface Account {
		account_id: string;
		name: string;
		type: string;
		subtype: string;
		balance: number;
		currency: string;
		institution_name: string;
	}

	interface Institution {
		item_id: string;
		institution_name: string;
		assets: number;
		liabilities: number;
		error?: string;
	}

	interface NetWorthData {
		net_worth: number;
		total_assets: number;
		total_liabilities: number;
		accounts: Account[];
		institutions: Institution[];
	}

	let data = $state<NetWorthData | null>(null);
	let loading = $state(true);
	let fetchError = $state('');
	let removingId = $state<string | null>(null);

	async function fetchNetWorth() {
		loading = true;
		fetchError = '';
		try {
			const res = await fetch('/api/plaid/net-worth');
			if (res.status === 401 || res.status === 403) {
				fetchError = 'Admin access required';
				return;
			}
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? 'Failed to load net worth');
			}
			data = await res.json();
		} catch (e) {
			fetchError = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	async function removeItem(itemId: string) {
		removingId = itemId;
		try {
			const res = await fetch(`/api/plaid/items/${itemId}`, { method: 'DELETE' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? 'Failed to unlink account');
			}
			await fetchNetWorth();
		} catch (e) {
			fetchError = (e as Error).message;
		} finally {
			removingId = null;
		}
	}

	$effect(() => {
		untrack(() => void fetchNetWorth());
	});

	function fmt(val: number): string {
		const prefix = val < 0 ? '-$' : '$';
		return prefix + Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	const netWorthClass = $derived(
		data && data.net_worth >= 0 ? 'positive' : 'negative'
	);
</script>

<section class="networth-widget glass" data-testid="networth-widget">
	<div class="widget-header">
		<h3>Net Worth</h3>
		<span class="badge">Live</span>
	</div>

	{#if loading}
		<div class="state-msg">Loading…</div>
	{:else if fetchError}
		<div class="state-msg error">{fetchError}</div>
	{:else if !data || data.institutions.length === 0}
		<div class="empty-state">
			<p>No bank accounts linked yet.</p>
			<PlaidLinkButton onLinked={fetchNetWorth} />
		</div>
	{:else}
		<div class="net-worth-value {netWorthClass}">
			{fmt(data.net_worth)}
		</div>

		<div class="summary-row">
			<div class="summary-item assets">
				<span class="summary-label">Assets</span>
				<span class="summary-value">{fmt(data.total_assets)}</span>
			</div>
			<div class="summary-item liabilities">
				<span class="summary-label">Liabilities</span>
				<span class="summary-value">{fmt(data.total_liabilities)}</span>
			</div>
		</div>

		<ul class="institution-list">
			{#each data.institutions as inst}
				<li class="institution-row">
					<div class="inst-info">
						<span class="inst-name">{inst.institution_name}</span>
						{#if inst.error}
							<span class="inst-error">Error fetching data</span>
						{:else}
							<span class="inst-net">{fmt(inst.assets - inst.liabilities)}</span>
						{/if}
					</div>
					<button
						class="unlink-btn"
						onclick={() => removeItem(inst.item_id)}
						disabled={removingId === inst.item_id}
						aria-label="Unlink {inst.institution_name}"
					>
						{removingId === inst.item_id ? '…' : 'Unlink'}
					</button>
				</li>
			{/each}
		</ul>

		<div class="link-more">
			<PlaidLinkButton onLinked={fetchNetWorth} />
		</div>
	{/if}

	{#if fetchError && data}
		<p class="inline-error">{fetchError}</p>
	{/if}
</section>

<style>
	.networth-widget {
		border-radius: var(--radius-md, 12px);
		padding: 1.5rem;
		box-shadow: var(--shadow-card);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
		box-sizing: border-box;
	}

	.widget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.widget-header h3 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.7;
	}

	.badge {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: var(--color-accent, #6366f1);
		color: #fff;
	}

	.net-worth-value {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1.1;
	}

	.net-worth-value.positive {
		color: var(--color-success, #22c55e);
	}

	.net-worth-value.negative {
		color: var(--color-error, #ef4444);
	}

	.summary-row {
		display: flex;
		gap: 1rem;
	}

	.summary-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.summary-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.6;
	}

	.summary-value {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.assets .summary-value {
		color: var(--color-success, #22c55e);
	}

	.liabilities .summary-value {
		color: var(--color-error, #ef4444);
	}

	.institution-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
		overflow-y: auto;
		min-height: 0;
	}

	.institution-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm, 8px);
		background: color-mix(in srgb, currentColor 5%, transparent);
	}

	.inst-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.inst-name {
		font-size: 0.85rem;
		font-weight: 600;
	}

	.inst-net {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.inst-error {
		font-size: 0.75rem;
		color: var(--color-error, #ef4444);
	}

	.unlink-btn {
		background: none;
		border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
		border-radius: var(--radius-sm, 8px);
		padding: 0.2rem 0.6rem;
		font-size: 0.75rem;
		cursor: pointer;
		color: inherit;
		opacity: 0.7;
		transition: opacity 0.15s;
	}

	.unlink-btn:hover:not(:disabled) {
		opacity: 1;
	}

	.unlink-btn:disabled {
		cursor: not-allowed;
	}

	.state-msg {
		opacity: 0.6;
		font-size: 0.875rem;
	}

	.state-msg.error {
		color: var(--color-error, #ef4444);
		opacity: 1;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.875rem;
		opacity: 0.6;
	}

	.link-more {
		margin-top: auto;
	}

	.inline-error {
		color: var(--color-error, #ef4444);
		font-size: 0.75rem;
		margin: 0;
	}
</style>

<script lang="ts">
	import { untrack } from 'svelte';
	import type { BudgetVariant } from '$lib/stores/ui';

	interface BudgetData {
		remaining: string;
		total: number;
		spent: number;
		income: number;
		dailyAllowance: string;
	}

	let {
		budget = undefined,
		netWorth = undefined,
		variant = 'standard'
	}: { budget?: BudgetData; netWorth?: number; variant?: BudgetVariant } = $props();

	let fetchedBudget = $state<BudgetData | null>(null);
	let loading = $state(false);
	let fetchError = $state('');

	$effect(() => {
		if (budget !== undefined) return;
		untrack(async () => {
			loading = true;
			fetchError = '';
			try {
				const res = await fetch('/api/plaid/budget');
				if (res.status === 401 || res.status === 403) {
					fetchError = 'Admin access required';
					return;
				}
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					fetchError = body.error ?? 'Failed to load budget';
					return;
				}
				fetchedBudget = await res.json();
			} catch {
				fetchError = 'Could not connect to server';
			} finally {
				loading = false;
			}
		});
	});

	let activeBudget = $derived(budget ?? fetchedBudget);
	let progressPercent = $derived(
		activeBudget && activeBudget.total > 0
			? Math.min(100, (activeBudget.spent / activeBudget.total) * 100)
			: 0
	);

	let clearing = $state(false);
	let clearError = $state('');

	async function clearAllData() {
		if (!confirm('Remove all linked accounts and Plaid data from the database? This cannot be undone.')) return;
		clearing = true;
		clearError = '';
		try {
			const res = await fetch('/api/plaid/clear', { method: 'DELETE' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? 'Failed to clear data');
			}
			fetchedBudget = null;
		} catch (e) {
			clearError = (e as Error).message;
		} finally {
			clearing = false;
		}
	}
</script>

<section class="budget-widget glass" data-testid="budget-widget">
	<div class="widget-header">
		<h3>Budget</h3>
		<span class="badge">Monthly</span>
	</div>

	{#if netWorth !== undefined}
		<div class="net-worth-hero">
			<span class="net-worth-label">Net Worth</span>
			<span class="net-worth-value" class:positive={netWorth >= 0} class:negative={netWorth < 0}>
				{netWorth < 0 ? '-' : ''}${Math.abs(netWorth).toLocaleString()}
			</span>
		</div>
	{/if}

	{#if loading}
		<div class="loading-state">Loading…</div>
	{:else if fetchError}
		<div class="state-msg error">{fetchError}</div>
	{:else if !activeBudget}
		<div class="state-msg">
			<p>No transaction data yet.</p>
			<p class="hint">Link a bank account to see your budget.</p>
		</div>
	{:else}
		<div class="metrics-grid">
			<div class="metric">
				<span class="metric-label">Monthly Budget</span>
				<span class="metric-value">{activeBudget.remaining}</span>
			</div>
			<div class="metric">
				<span class="metric-label">Daily Allowance</span>
				<span class="metric-value">{activeBudget.dailyAllowance}</span>
			</div>
		</div>

		{#if variant === 'standard'}
			<div
				class="progress-track"
				role="progressbar"
				aria-valuenow={activeBudget.spent}
				aria-valuemax={activeBudget.total}
				aria-label="Budget spent"
			>
				<div class="progress-fill" style="width: {progressPercent}%"></div>
			</div>

			<div class="budget-meta">
				<span class="meta-item">${activeBudget.spent.toLocaleString()} spent</span>
				<span class="meta-item">${activeBudget.total.toLocaleString()} total</span>
			</div>
		{/if}
	{/if}

	<div class="clear-row">
		{#if clearError}<span class="clear-error">{clearError}</span>{/if}
		<button class="clear-btn" onclick={clearAllData} disabled={clearing} aria-label="Clear all Plaid data">
			{clearing ? 'Clearing…' : 'Clear All Data'}
		</button>
	</div>
</section>

<style>
	.budget-widget {
		border-radius: var(--radius-md, 12px);
		padding: 1.5rem;
		box-shadow: var(--shadow-card);
	}

	.widget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	h3 {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary, #2d2d3a);
		margin: 0;
	}

	.badge {
		display: inline-block;
		background: var(--accent-secondary-soft, rgba(244, 168, 54, 0.15));
		color: var(--accent-secondary, #f4a836);
		border-radius: 999px;
		padding: 0.15rem 0.6rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.metric {
		background: var(--bg-surface, #f0eef8);
		border-radius: var(--radius-sm, 8px);
		padding: 0.6rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.metric-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted, #a0a0c0);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.metric-value {
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary, #2d2d3a);
	}

	.progress-track {
		position: relative;
		background: var(--bg-surface, #f0eef8);
		border-radius: 999px;
		height: 8px;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(
			90deg,
			var(--accent-secondary, #f4a836),
			var(--accent-primary, #ff6b8b)
		);
		border-radius: 999px;
		transition: width 0.4s ease;
	}

	.budget-meta {
		display: flex;
		justify-content: space-between;
	}

	.meta-item {
		font-size: 0.8rem;
		color: var(--text-secondary, #6b6b8a);
		font-weight: 500;
	}

	.net-worth-hero {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		margin-bottom: 1rem;
	}

	.net-worth-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted, #a0a0c0);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.net-worth-value {
		font-size: 1.5rem;
		font-weight: 800;
	}

	.net-worth-value.positive {
		color: var(--accent-secondary, #f4a836);
	}

	.net-worth-value.negative {
		color: var(--accent-primary, #ff6b8b);
	}

	.loading-state {
		font-size: 0.85rem;
		color: var(--text-muted, #a0a0c0);
		padding: 1rem 0;
		text-align: center;
	}

	.state-msg {
		padding: 1.25rem 0;
		text-align: center;
		font-size: 0.9rem;
		color: var(--text-secondary, #6b6b8a);
	}

	.state-msg.error {
		color: var(--color-error, #ef4444);
	}

	.state-msg p {
		margin: 0 0 0.25rem;
	}

	.state-msg .hint {
		font-size: 0.78rem;
		color: var(--text-muted, #a0a0c0);
	}

	.clear-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.clear-error {
		font-size: 0.75rem;
		color: var(--color-error, #ef4444);
	}

	.clear-btn {
		background: none;
		border: 1px solid color-mix(in srgb, var(--color-error, #ef4444) 50%, transparent);
		border-radius: var(--radius-sm, 8px);
		padding: 0.3rem 0.75rem;
		font-size: 0.75rem;
		cursor: pointer;
		color: var(--color-error, #ef4444);
		opacity: 0.75;
		transition: opacity 0.15s;
	}

	.clear-btn:hover:not(:disabled) {
		opacity: 1;
	}

	.clear-btn:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}
</style>

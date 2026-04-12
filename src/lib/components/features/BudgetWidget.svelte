<script lang="ts">
	import type { BudgetVariant } from '$lib/stores/ui';

	interface BudgetData {
		remaining: string;
		total: number;
		spent: number;
		dailyAllowance: string;
	}

	let {
		budget = { remaining: '$4,520', total: 6000, spent: 1480, dailyAllowance: '$150' },
		variant = 'standard'
	}: { budget?: BudgetData; variant?: BudgetVariant } = $props();

	let progressPercent = $derived(Math.min(100, (budget.spent / budget.total) * 100));
</script>

<section class="budget-widget glass" data-testid="budget-widget">
	<div class="widget-header">
		<h3>Budget</h3>
		<span class="badge">Monthly</span>
	</div>

	<div class="metrics-grid">
		<div class="metric">
			<span class="metric-label">Monthly Budget</span>
			<span class="metric-value">{budget.remaining}</span>
		</div>
		<div class="metric">
			<span class="metric-label">Daily Allowance</span>
			<span class="metric-value">{budget.dailyAllowance}</span>
		</div>
	</div>

	{#if variant === 'standard'}
		<div
			class="progress-track"
			role="progressbar"
			aria-valuenow={budget.spent}
			aria-valuemax={budget.total}
			aria-label="Budget spent"
		>
			<div class="progress-fill" style="width: {progressPercent}%"></div>
		</div>

		<div class="budget-meta">
			<span class="meta-item">${budget.spent.toLocaleString()} spent</span>
			<span class="meta-item">${budget.total.toLocaleString()} total</span>
		</div>
	{/if}
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
</style>

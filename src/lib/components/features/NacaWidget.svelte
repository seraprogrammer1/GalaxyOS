<script lang="ts">
	interface NacaData {
		homePrice: string;
		monthlyTI: string;
		buyDown: string;
		totalFunds: string;
	}

	let {
		naca = {
			homePrice: '$250,000',
			monthlyTI: '$350',
			buyDown: '5 points',
			totalFunds: '$12,500'
		}
	}: { naca?: NacaData } = $props();
</script>

<section class="naca-widget glass" data-testid="naca-widget">
	<div class="widget-header">
		<h3>NACA Summary</h3>
		<span class="badge">Mortgage</span>
	</div>

	<div class="metrics-grid">
		<div class="metric">
			<span class="metric-label">Home Price</span>
			<span class="metric-value">{naca.homePrice}</span>
		</div>
		<div class="metric">
			<span class="metric-label">Monthly TI</span>
			<span class="metric-value">{naca.monthlyTI}</span>
		</div>
		<div class="metric">
			<span class="metric-label">Buy Down</span>
			<span class="metric-value">{naca.buyDown}</span>
		</div>
		<div class="metric">
			<span class="metric-label">Total Funds</span>
			<span class="metric-value">{naca.totalFunds}</span>
		</div>
	</div>

	<button class="open-calc-btn">Open Calculator</button>
</section>

<style>
	.naca-widget {
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
		background: var(--accent-primary-soft, rgba(255, 107, 139, 0.15));
		color: var(--accent-primary, #ff6b8b);
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

	.open-calc-btn {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid var(--accent-primary, #ff6b8b);
		border-radius: var(--radius-sm, 8px);
		background: var(--accent-primary-soft, rgba(255, 107, 139, 0.15));
		color: var(--accent-primary, #ff6b8b);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.2s,
			transform 0.1s;
	}

	.open-calc-btn:hover {
		background: var(--accent-primary, #ff6b8b);
		color: #fff;
	}

	.open-calc-btn:active {
		transform: scale(0.97);
	}
</style>

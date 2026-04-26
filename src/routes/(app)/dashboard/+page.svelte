<script lang="ts">
	import Goals from '$lib/components/features/Goals.svelte';
	import BudgetWidget from '$lib/components/features/BudgetWidget.svelte';
	import RecentChatsWidget from '$lib/components/features/RecentChatsWidget.svelte';
	import { uiStore } from '$lib/stores/ui';

	const now = new Date();
	const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
</script>

<div class="dash" data-testid="dashboard-root">
	<!-- Hero Banner -->
	<div class="hero glass">
		<div class="hero-eyebrow"><span aria-hidden="true">✦</span> Mission Control</div>
		<h2 class="hero-title">Welcome back, Commander</h2>
		<p class="hero-date">{dateStr}</p>
	</div>

	<!-- Card Grid -->
	<div class="card-grid">
		<div class="eth-card glass">
			<div class="eth-card-header">
				<span class="card-label">Budget Summary</span>
				<span class="card-sparkle" aria-hidden="true">✦</span>
			</div>
			<div class="eth-card-body">
				<BudgetWidget variant={$uiStore.budgetVariant} />
			</div>
		</div>

		<div class="eth-card glass">
			<div class="eth-card-header">
				<span class="card-label">Recent AI Activity</span>
				<span class="card-sparkle" aria-hidden="true">✦</span>
			</div>
			<div class="eth-card-body">
				<RecentChatsWidget />
			</div>
		</div>

		<div class="eth-card glass">
			<div class="eth-card-header">
				<span class="card-label">Goals &amp; Progress</span>
				<span class="card-sparkle" aria-hidden="true">✦</span>
			</div>
			<div class="eth-card-body">
				<Goals />
			</div>
		</div>
	</div>
</div>

<style>
	.dash {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		height: 100%;
		min-height: 0;
		overflow-y: auto;
	}

	/* ── Hero ── */
	.hero {
		padding: 1.5rem 2rem;
		border-radius: var(--radius-xl);
		background: linear-gradient(
			120deg,
			rgba(244, 194, 194, 0.55) 0%,
			rgba(217, 186, 247, 0.42) 50%,
			rgba(180, 198, 252, 0.38) 100%
		);
	}

	:global([data-theme='dark']) .hero {
		background: linear-gradient(
			120deg,
			rgba(120, 40, 80, 0.35) 0%,
			rgba(80, 40, 120, 0.30) 50%,
			rgba(40, 60, 120, 0.25) 100%
		);
	}

	.hero-eyebrow {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent-primary);
		margin-bottom: 0.4rem;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.hero-title {
		font-size: 1.55rem;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.025em;
		margin-bottom: 0.3rem;
	}

	.hero-date {
		font-size: 0.82rem;
		color: var(--text-muted);
		font-weight: 400;
	}

	/* ── Card Grid ── */
	.card-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.25rem;
		flex: 1;
		min-height: 0;
	}

	@media (max-width: 1100px) {
		.card-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 720px) {
		.card-grid {
			grid-template-columns: 1fr;
		}
	}

	/* ── Card ── */
	.eth-card {
		display: flex;
		flex-direction: column;
		border-radius: var(--radius-xl);
		overflow: hidden;
	}

	.eth-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.9rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.45);
	}

	:global([data-theme='dark']) .eth-card-header {
		border-bottom-color: rgba(255, 255, 255, 0.07);
	}

	.card-label {
		font-size: 0.82rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.card-sparkle {
		font-size: 0.7rem;
		color: var(--accent-secondary);
		opacity: 0.7;
	}

	.eth-card-body {
		flex: 1;
		min-height: 0;
		overflow: hidden;
		padding: 0.5rem 0;
	}
</style>

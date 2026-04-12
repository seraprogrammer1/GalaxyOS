<script lang="ts">
	import { uiStore, type DashboardLayout, type BudgetVariant } from '$lib/stores/ui';

	let { username = 'Explorer' }: { username?: string } = $props();

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}

	function handleLayoutChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value as DashboardLayout;
		uiStore.setDashboardLayout(value);
	}

	function handleBudgetVariantChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value as BudgetVariant;
		uiStore.setBudgetVariant(value);
	}
</script>

<header class="glass-header glass">
	<div class="header-left">
		<h1 class="title">Galaxy OS</h1>
		<p class="greeting">Hello, {username}</p>
	</div>

	<div class="weather">
		<span class="weather-icon" aria-label="Sunny">☀</span>
		<span class="weather-temp">72°F</span>
	</div>

	<nav class="header-nav">
		<label class="compact-control">
			<span>Layout</span>
			<select
				data-testid="layout-select"
				value={$uiStore.dashboardLayout}
				onchange={handleLayoutChange}
			>
				<option value="bento">Bento</option>
				<option value="sidebar">Sidebar</option>
				<option value="columns">Columns</option>
			</select>
		</label>

		<label class="compact-control">
			<span>Budget</span>
			<select
				data-testid="budget-variant-select"
				value={$uiStore.budgetVariant}
				onchange={handleBudgetVariantChange}
			>
				<option value="standard">Standard</option>
				<option value="minimal">Minimal</option>
			</select>
		</label>

		<a href="/chat" class="nav-link" aria-label="Chat">
			<span class="nav-icon">💬</span>
			<span class="notification-badge">3 New</span>
		</a>
		<a href="/settings" class="nav-link" aria-label="Settings">
			<span class="nav-icon">⚙</span>
		</a>
	</nav>

	<button class="logout-btn" onclick={handleLogout}> Logout </button>
</header>

<style>
	.glass-header {
		position: sticky;
		top: 0;
		z-index: 100;
		height: var(--header-height, 64px);
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0 1.5rem;
		border-bottom: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
	}

	.header-left {
		flex: 1;
	}

	.title {
		font-size: 1.25rem;
		font-weight: 700;
		background: linear-gradient(
			135deg,
			var(--accent-primary, #ff6b8b),
			var(--accent-secondary, #f4a836)
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.greeting {
		margin-top: 0.1rem;
		font-size: 0.82rem;
		color: var(--text-secondary, #6b6b8a);
		font-weight: 600;
	}

	.weather {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text-secondary, #6b6b8a);
		font-size: 0.9rem;
	}

	.logout-btn {
		padding: 0.4rem 1rem;
		border: 1px solid var(--accent-primary, #ff6b8b);
		border-radius: var(--radius-sm, 8px);
		background: var(--accent-primary-soft, rgba(255, 107, 139, 0.15));
		color: var(--accent-primary, #ff6b8b);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background 0.2s,
			transform 0.1s;
	}

	.logout-btn:hover {
		background: var(--accent-primary, #ff6b8b);
		color: #fff;
	}

	.logout-btn:active {
		transform: scale(0.97);
	}

	.header-nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.compact-control {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary, #6b6b8a);
		background: var(--bg-surface, #f0eef8);
		padding: 0.35rem 0.45rem;
		border-radius: var(--radius-sm, 8px);
	}

	.compact-control select {
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
		border-radius: 6px;
		padding: 0.18rem 0.3rem;
		font-size: 0.75rem;
		color: var(--text-secondary, #6b6b8a);
		background: #fff;
	}

	.nav-link {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.4rem 0.7rem;
		border-radius: var(--radius-sm, 8px);
		background: var(--bg-surface, #f0eef8);
		text-decoration: none;
		color: var(--text-secondary, #6b6b8a);
		font-size: 0.85rem;
		font-weight: 500;
		transition: background 0.2s;
	}

	.nav-link:hover {
		background: var(--bg-glass-border, rgba(255, 255, 255, 0.85));
	}

	.nav-icon {
		font-size: 1rem;
	}

	.notification-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: var(--accent-primary, #ff6b8b);
		color: #fff;
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		animation: pulse-badge 2s ease-in-out infinite;
	}

	@keyframes pulse-badge {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}
</style>

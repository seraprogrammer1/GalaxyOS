<script lang="ts">
	let {
		username = 'Explorer',
		currentPath = '/dashboard'
	}: { username?: string; currentPath?: string } = $props();

	const pageTitle = $derived(
		currentPath === '/dashboard'
			? 'Dashboard'
			: currentPath === '/settings'
				? 'Settings'
				: currentPath === '/chat'
					? 'AI Chat'
					: currentPath === '/naca'
						? 'NACA Calculator'
						: currentPath === '/budgets'
							? 'Finance Overview'
							: currentPath === '/characters'
								? 'Characters'
								: 'Galaxy OS'
	);

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<header class="glass-header glass">
	<div class="header-left">
		<h1 class="title">{pageTitle}</h1>
		<p class="greeting">Hello, {username}</p>
	</div>

	<div class="weather">
		<span class="weather-icon" aria-label="Sunny">☀</span>
		<span class="weather-temp">72°F</span>
	</div>

	<div class="header-controls">
		<span class="notification-badge" aria-label="Notifications">3 New</span>
	</div>

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

	.header-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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

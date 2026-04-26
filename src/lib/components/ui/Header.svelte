<script lang="ts">
	let {
		username = 'Explorer',
		currentPath = '/dashboard'
	}: { username?: string; currentPath?: string } = $props();

	const pageTitle = $derived(
		currentPath === '/dashboard'
			? 'Command Center'
			: currentPath === '/settings'
				? 'System Settings'
				: currentPath === '/chat'
					? 'AI Chat Console'
					: currentPath === '/naca'
						? 'NACA Calculator'
						: currentPath === '/budgets'
							? 'Finance Overview'
							: currentPath === '/characters'
								? 'Character Hub'
								: 'Galaxy OS'
	);

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<header class="glass-header glass">
	<div class="header-left">
		<h1 class="title">
			<span class="title-prefix">Ethereal</span>
			{pageTitle}
		</h1>
		<p class="greeting">Hello, {username}</p>
	</div>

	<div class="header-right">
		<div class="weather">
			<span class="weather-icon" aria-label="Clear">✳</span>
			<span class="weather-temp">72°F</span>
		</div>
		<span class="notification-badge" aria-label="Notifications">2 New</span>
		<button class="logout-btn" onclick={handleLogout}>Logout</button>
	</div>
</header>

<style>
	.glass-header {
		position: sticky;
		top: 0;
		z-index: 100;
		height: var(--header-height, 64px);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.55);
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.title {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.title-prefix {
		color: var(--accent-primary);
		font-weight: 700;
	}

	.greeting {
		font-size: 0.78rem;
		color: var(--text-muted);
		font-weight: 400;
		letter-spacing: 0.01em;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.weather {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.weather-icon {
		font-size: 0.95rem;
		color: var(--accent-secondary);
	}

	.notification-badge {
		display: inline-flex;
		align-items: center;
		background: var(--accent-primary, #e8748a);
		color: #fff;
		font-size: 0.68rem;
		font-weight: 700;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		letter-spacing: 0.04em;
	}

	.logout-btn {
		padding: 0.4rem 1.1rem;
		border: 1px solid var(--bg-glass-border);
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.35);
		color: var(--text-primary);
		font-size: 0.82rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		letter-spacing: 0.01em;
		transition:
			background 0.18s cubic-bezier(0.23, 1, 0.32, 1),
			transform 0.1s;
	}

	.logout-btn:hover {
		background: rgba(255, 255, 255, 0.55);
	}

	.logout-btn:active {
		transform: scale(0.97);
	}

	:global([data-theme='dark']) .glass-header {
		border-bottom-color: rgba(255, 255, 255, 0.07);
	}

	:global([data-theme='dark']) .logout-btn {
		background: rgba(255, 255, 255, 0.06);
		color: #e1e1ef;
		border-color: rgba(255, 255, 255, 0.07);
	}

	:global([data-theme='dark']) .logout-btn:hover {
		background: rgba(255, 255, 255, 0.12);
	}
</style>


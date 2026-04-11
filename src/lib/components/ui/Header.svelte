<script lang="ts">
	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<header class="glass-header glass">
	<div class="header-left">
		<h1 class="title">Galaxy OS</h1>
	</div>

	<div class="weather">
		<span class="weather-icon" aria-label="Sunny">☀</span>
		<span class="weather-temp">72°F</span>
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
</style>

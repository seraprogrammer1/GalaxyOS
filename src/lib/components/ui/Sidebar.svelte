<script lang="ts">
	let {
		currentPath = '/dashboard',
		username = 'Explorer'
	}: { currentPath?: string; username?: string } = $props();

	const links = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/budgets', label: 'Budgets' },
		{ href: '/chat', label: 'AI Chat' },
		{ href: '/characters', label: 'Characters' },
		{ href: '/naca', label: 'NACA Calc' },
		{ href: '/settings', label: 'Settings' }
	];

	function isActive(href: string): boolean {
		return currentPath === href || currentPath.startsWith(`${href}/`);
	}

	const initials = $derived((username || 'Explorer').slice(0, 2).toUpperCase());
</script>

<aside class="sidebar glass" data-testid="sidebar">
	<div class="sidebar-brand">
		<h2>Galaxy OS</h2>
		<p>Command Center</p>
	</div>

	<nav class="sidebar-nav" aria-label="Sidebar Navigation">
		{#each links as link}
			<a
				href={link.href}
				class="nav-link"
				class:is-active={isActive(link.href)}
				data-testid={`sidebar-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
			>
				{link.label}
			</a>
		{/each}
	</nav>

	<div class="sidebar-profile" data-testid="sidebar-profile">
		<div class="avatar">{initials}</div>
		<div class="meta">
			<span class="name">{username}</span>
			<span class="role">Operator</span>
		</div>
	</div>
</aside>

<style>
	.sidebar {
		width: 16rem;
		min-width: 16rem;
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		border-right: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
	}

	.sidebar-brand h2 {
		font-size: 1.2rem;
		font-weight: 800;
		background: linear-gradient(
			135deg,
			var(--accent-primary, #ff6b8b),
			var(--accent-secondary, #f4a836)
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.sidebar-brand p {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b6b8a);
		margin-top: 0.2rem;
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1.25rem;
		flex: 1;
	}

	.nav-link {
		text-decoration: none;
		color: var(--text-secondary, #6b6b8a);
		padding: 0.6rem 0.7rem;
		border-radius: var(--radius-sm, 8px);
		font-size: 0.92rem;
		font-weight: 600;
		transition:
			background 0.2s ease,
			color 0.2s ease;
	}

	.nav-link:hover {
		background: var(--bg-surface, #f0eef8);
	}

	.nav-link.is-active {
		background: linear-gradient(
			120deg,
			var(--accent-primary-soft, rgba(255, 107, 139, 0.2)),
			var(--accent-secondary-soft, rgba(244, 168, 54, 0.2))
		);
		color: var(--text-primary, #2d2d3a);
		outline: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
	}

	.sidebar-profile {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.6rem;
		border-radius: var(--radius-sm, 8px);
		background: var(--bg-surface, #f0eef8);
	}

	.avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 0.76rem;
		font-weight: 800;
		background: linear-gradient(
			135deg,
			var(--accent-primary, #ff6b8b),
			var(--accent-secondary, #f4a836)
		);
		color: #fff;
	}

	.meta {
		display: flex;
		flex-direction: column;
	}

	.name {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary, #2d2d3a);
	}

	.role {
		font-size: 0.72rem;
		color: var(--text-muted, #a0a0c0);
	}
</style>

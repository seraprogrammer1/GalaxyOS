<script lang="ts">
	let {
		currentPath = '/dashboard',
		username = 'Explorer'
	}: { currentPath?: string; username?: string } = $props();

	const links = [
		{ href: '/dashboard',  label: 'Dashboard',  icon: '⊞' },
		{ href: '/budgets',    label: 'Budgets',     icon: '◈' },
		{ href: '/chat',       label: 'AI Chat',     icon: '◎' },
		{ href: '/characters', label: 'Characters',  icon: '✦' },
		{ href: '/naca',       label: 'NACA Calc',   icon: '△' },
		{ href: '/settings',   label: 'Settings',    icon: '⊙' }
	];

	function isActive(href: string): boolean {
		return currentPath === href || currentPath.startsWith(`${href}/`);
	}

	const initials = $derived((username || 'Explorer').slice(0, 2).toUpperCase());
</script>

<aside class="sidebar" data-testid="sidebar">
	<div class="sidebar-brand">
		<div class="brand-icon" aria-hidden="true">✦</div>
		<div class="brand-text">
			<h2>Galaxy OS</h2>
			<p>Command Center</p>
		</div>
	</div>

	<nav class="sidebar-nav" aria-label="Sidebar Navigation">
		{#each links as link}
			<a
				href={link.href}
				class="nav-link"
				class:is-active={isActive(link.href)}
				data-testid={`sidebar-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
			>
				<span class="nav-icon" aria-hidden="true">{link.icon}</span>
				<span class="nav-label">{link.label}</span>
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
		width: 15rem;
		min-width: 15rem;
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 1.25rem 0.875rem;
		background: #11131c;
		border-right: 1px solid rgba(255, 255, 255, 0.06);
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.25rem 0.375rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		margin-bottom: 0.75rem;
	}

	.brand-icon {
		font-size: 1.5rem;
		line-height: 1;
		background: linear-gradient(135deg, #f4c2c2, #d9baf7);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		flex-shrink: 0;
	}

	.brand-text h2 {
		font-size: 0.95rem;
		font-weight: 700;
		color: #e1e1ef;
		letter-spacing: -0.01em;
	}

	.brand-text p {
		font-size: 0.7rem;
		color: #9d8d8d;
		margin-top: 0.1rem;
		letter-spacing: 0.03em;
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		flex: 1;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		text-decoration: none;
		color: #a0a0b8;
		padding: 0.6rem 0.75rem;
		border-radius: 10px;
		font-size: 0.88rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		border: 1px solid transparent;
		transition:
			background 0.18s cubic-bezier(0.23, 1, 0.32, 1),
			color 0.18s cubic-bezier(0.23, 1, 0.32, 1);
	}

	.nav-icon {
		font-size: 0.85rem;
		width: 1.1rem;
		text-align: center;
		opacity: 0.6;
		flex-shrink: 0;
		transition: opacity 0.18s;
	}

	.nav-link:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #e1e1ef;
	}

	.nav-link:hover .nav-icon {
		opacity: 1;
	}

	.nav-link.is-active {
		background: linear-gradient(
			135deg,
			rgba(244, 194, 194, 0.18),
			rgba(217, 186, 247, 0.14)
		);
		color: #f4c2c2;
		border-color: rgba(244, 194, 194, 0.22);
	}

	.nav-link.is-active .nav-icon {
		opacity: 1;
	}

	.sidebar-profile {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.75rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
		margin-top: 0.5rem;
	}

	.avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 0.72rem;
		font-weight: 700;
		background: linear-gradient(135deg, #f4c2c2, #d9baf7);
		color: #3d1a2e;
		flex-shrink: 0;
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}

	.name {
		font-size: 0.82rem;
		font-weight: 600;
		color: #e1e1ef;
		letter-spacing: -0.01em;
	}

	.role {
		font-size: 0.68rem;
		color: #9d8d8d;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
</style>


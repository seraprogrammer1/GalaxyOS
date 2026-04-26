<script lang="ts">
	import { page } from '$app/stores';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import ModalHost from '$lib/components/ui/ModalHost.svelte';
	import { uiStore } from '$lib/stores/ui';
	import { themeStore } from '$lib/stores/theme';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let { children, data }: { children?: Snippet; data?: { user?: { username?: string } | null } } =
		$props();

	onMount(() => {
		uiStore.init();
	});
</script>

<div class="app-shell" data-theme={$themeStore}>
	<Sidebar currentPath={$page.url.pathname} username={data?.user?.username ?? 'Explorer'} />
	<div class="app-main">
		<div class="bg-canvas" aria-hidden="true">
			<div class="bg-orb orb-a"></div>
			<div class="bg-orb orb-b"></div>
			<div class="bg-orb orb-c"></div>
		</div>
		<Header username={data?.user?.username ?? 'Explorer'} currentPath={$page.url.pathname} />
		<main class="main-content">
			{@render children?.()}
		</main>
	</div>
	<ModalHost />
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: row;
		height: 100vh;
		width: 100vw;
		overflow: hidden;
	}

	.app-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-width: 0;
		position: relative;
		background: linear-gradient(135deg, #fce4ec 0%, #f3e5f5 35%, #ede7f6 65%, #e8eaf6 100%);
	}

	:global([data-theme='dark']) .app-main {
		background: linear-gradient(135deg, #1a0e1e 0%, #130d22 35%, #0e1020 65%, #0b0d18 100%);
	}

	.bg-canvas {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.bg-orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
	}
	.orb-a {
		width: 55vw; height: 55vw;
		top: -20%; left: -10%;
		background: radial-gradient(circle, rgba(252, 180, 200, 0.50) 0%, transparent 65%);
	}
	.orb-b {
		width: 45vw; height: 45vw;
		top: 20%; right: -15%;
		background: radial-gradient(circle, rgba(209, 180, 252, 0.45) 0%, transparent 65%);
	}
	.orb-c {
		width: 40vw; height: 40vw;
		bottom: -15%; left: 30%;
		background: radial-gradient(circle, rgba(180, 198, 252, 0.35) 0%, transparent 65%);
	}

	:global([data-theme='dark']) .orb-a {
		background: radial-gradient(circle, rgba(120, 40, 80, 0.45) 0%, transparent 65%);
	}
	:global([data-theme='dark']) .orb-b {
		background: radial-gradient(circle, rgba(80, 40, 120, 0.40) 0%, transparent 65%);
	}
	:global([data-theme='dark']) .orb-c {
		background: radial-gradient(circle, rgba(40, 60, 120, 0.35) 0%, transparent 65%);
	}

	.main-content {
		position: relative;
		z-index: 1;
		flex: 1;
		padding: 1.5rem;
		overflow: hidden;
		width: 100%;
		min-height: 0;
	}
</style>

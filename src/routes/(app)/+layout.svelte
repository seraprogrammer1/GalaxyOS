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
		background-color: var(--bg-base, #fafafa);
	}

	.app-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-width: 0;
	}

	.main-content {
		flex: 1;
		padding: 1.5rem;
		overflow: hidden;
		width: 100%;
		min-height: 0;
	}
</style>

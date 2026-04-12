<script lang="ts">
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
	<Header username={data?.user?.username ?? 'Explorer'} />
	<main class="main-content">
		{@render children?.()}
	</main>
	<ModalHost />
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		overflow: hidden;
		background-color: var(--bg-base, #fafafa);
	}

	.main-content {
		flex: 1;
		padding: 1.5rem;
		overflow: hidden;
		width: 100%;
		min-height: 0;
	}
</style>

<script lang="ts">
	import Header from '$lib/components/ui/Header.svelte';
	import ModalHost from '$lib/components/ui/ModalHost.svelte';
	import { themeStore } from '$lib/stores/theme';
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="app-shell" data-theme={$themeStore}>
	<Header />
	<main class="main-content">
		{@render children?.()}
	</main>
	<ModalHost />
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background-color: var(--bg-base, #fafafa);
	}

	.main-content {
		flex: 1;
		padding: 1.5rem;
		max-width: 1400px;
		width: 100%;
		margin: 0 auto;
	}
</style>

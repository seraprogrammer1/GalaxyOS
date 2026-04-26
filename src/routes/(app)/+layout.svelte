<script lang="ts">
	import { page } from '$app/state';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import ModalHost from '$lib/components/ui/ModalHost.svelte';
	import { uiStore } from '$lib/stores/ui';
	import { themeStore, type ThemeId } from '$lib/stores/theme';
	import { THEMES } from '$lib/themes';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let { children, data }: { children?: Snippet; data?: { user?: { username?: string } | null } } =
		$props();

	let shellEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (!shellEl) return;
		const def = THEMES[$themeStore] ?? THEMES['light-cosmic'];
		shellEl.setAttribute('data-theme', def.mode);
		for (const [k, v] of Object.entries(def.vars)) {
			shellEl.style.setProperty(k, v);
		}
	});

	onMount(() => {
		// Fast restore from localStorage before the API responds
		const saved = window.localStorage.getItem('galaxyos-theme') as ThemeId | null;
		if (saved && saved in THEMES) {
			themeStore.set(saved);
		}

		uiStore.init();

		// Hydrate theme from server settings (authoritative)
		fetch('/api/settings')
			.then((r) => r.json())
			.then((data: { theme?: string }) => {
				if (data.theme && data.theme in THEMES) {
					themeStore.set(data.theme as ThemeId);
				}
			})
			.catch(() => {});
	});
</script>

<div class="app-shell" bind:this={shellEl}>
	<Sidebar currentPath={page.url.pathname} username={data?.user?.username ?? 'Explorer'} />
	<div class="app-main">
		<div class="bg-canvas" aria-hidden="true">
			<div class="bg-orb orb-a"></div>
			<div class="bg-orb orb-b"></div>
			<div class="bg-orb orb-c"></div>
		</div>
		<Header username={data?.user?.username ?? 'Explorer'} currentPath={page.url.pathname} />
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
		background: var(--gradient-bg);
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
		background: var(--orb-a-color);
	}
	.orb-b {
		width: 45vw; height: 45vw;
		top: 20%; right: -15%;
		background: var(--orb-b-color);
	}
	.orb-c {
		width: 40vw; height: 40vw;
		bottom: -15%; left: 30%;
		background: var(--orb-c-color);
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

<script lang="ts">
	import SkeletonLoader from '$lib/components/ui/SkeletonLoader.svelte';
	import DebugModal from '$lib/components/ui/DebugModal.svelte';
	import Goals from '$lib/components/features/Goals.svelte';
	import { modalStore } from '$lib/stores/modal';

	let showSkeleton = $state(false);

	function openDebugModal() {
		modalStore.open(DebugModal as never);
	}
</script>

<section class="dashboard">
	<h2>Welcome back</h2>
	<p class="subtitle">Galaxy OS is ready.</p>

	<Goals />

	{#if showSkeleton}
		<SkeletonLoader width="300px" height="20px" />
	{/if}

	<!-- Debug controls (used by E2E tests) -->
	<div class="debug-controls" aria-hidden="true">
		<button data-testid="debug-open-modal" onclick={openDebugModal}>
			[Debug] Open Modal
		</button>
		<button data-testid="debug-show-skeleton" onclick={() => (showSkeleton = !showSkeleton)}>
			[Debug] Toggle Skeleton
		</button>
	</div>
</section>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	h2 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary, #2d2d3a);
	}

	.subtitle {
		color: var(--text-secondary, #6b6b8a);
	}

	.debug-controls {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.debug-controls button {
		padding: 0.35rem 0.75rem;
		font-size: 0.75rem;
		border: 1px dashed var(--text-muted, #a0a0c0);
		border-radius: var(--radius-sm, 8px);
		background: transparent;
		color: var(--text-muted, #a0a0c0);
		cursor: pointer;
		font-family: monospace;
	}
</style>

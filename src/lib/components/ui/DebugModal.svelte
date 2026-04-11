<script lang="ts">
	import { modalStore } from '$lib/stores/modal';
</script>

<div class="debug-modal-content">
	<h3>Debug Modal</h3>
	<p>Modal system is working correctly.</p>
	<button onclick={() => modalStore.close()}>Close</button>
</div>

<style>
	.debug-modal-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 240px;
	}

	h3 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary, #2d2d3a);
	}

	p {
		color: var(--text-secondary, #6b6b8a);
		font-size: 0.9rem;
	}

	button {
		align-self: flex-end;
		padding: 0.4rem 1rem;
		border: 1px solid var(--accent-primary, #ff6b8b);
		border-radius: var(--radius-sm, 8px);
		background: transparent;
		color: var(--accent-primary, #ff6b8b);
		cursor: pointer;
	}
</style>

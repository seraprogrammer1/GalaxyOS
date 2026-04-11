<script lang="ts">
	import { modalStore } from '$lib/stores/modal';

	const active = $derived($modalStore);
	const ModalComponent = $derived(active?.component as never);
</script>

<div data-modal-host>
	{#if active && ModalComponent}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="backdrop" role="presentation" onclick={() => modalStore.close()}>
			<div
				class="modal-container glass"
				role="dialog"
				aria-modal="true"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && modalStore.close()}
			>
				<ModalComponent {...(active.props ?? {})} />
			</div>
		</div>
	{/if}
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(45, 45, 58, 0.45);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-container {
		border-radius: var(--radius-lg, 20px);
		padding: 2rem;
		min-width: 320px;
		max-width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
	}
</style>

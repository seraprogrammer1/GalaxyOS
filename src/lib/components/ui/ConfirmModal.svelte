<script lang="ts">
	let {
		title = 'Are you sure?',
		message = '',
		showCheckbox = false,
		onConfirm,
		onCancel
	}: {
		title?: string;
		message?: string;
		showCheckbox?: boolean;
		onConfirm?: (dontAskAgain: boolean) => void;
		onCancel?: () => void;
	} = $props();

	let dontAskAgain = $state(false);
</script>

<div class="confirm-modal" data-testid="confirm-modal">
	<h3 class="modal-title">{title}</h3>

	{#if message}
		<p class="modal-message">{message}</p>
	{/if}

	{#if showCheckbox}
		<label class="dont-ask-label">
			<input
				type="checkbox"
				bind:checked={dontAskAgain}
				data-testid="dont-ask-again-checkbox"
			/>
			Don't ask me again
		</label>
	{/if}

	<div class="modal-actions">
		<button
			class="btn-cancel"
			onclick={() => onCancel?.()}
			data-testid="cancel-btn"
		>
			Cancel
		</button>
		<button
			class="btn-confirm"
			onclick={() => onConfirm?.(dontAskAgain)}
			data-testid="confirm-btn"
		>
			Confirm
		</button>
	</div>
</div>

<style>
	.confirm-modal {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 280px;
	}

	.modal-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary, #2d2d3a);
		margin: 0;
	}

	.modal-message {
		font-size: 0.9rem;
		color: var(--text-secondary, #6b6b80);
		margin: 0;
	}

	.dont-ask-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-secondary, #6b6b80);
		cursor: pointer;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.btn-cancel {
		padding: 0.45rem 1rem;
		background: transparent;
		border: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.15));
		border-radius: var(--radius-sm, 8px);
		font-size: 0.875rem;
		cursor: pointer;
		color: var(--text-secondary, #6b6b80);
	}

	.btn-confirm {
		padding: 0.45rem 1rem;
		background: var(--accent-danger, #e05252);
		color: #fff;
		border: none;
		border-radius: var(--radius-sm, 8px);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-confirm:hover {
		opacity: 0.88;
	}
</style>

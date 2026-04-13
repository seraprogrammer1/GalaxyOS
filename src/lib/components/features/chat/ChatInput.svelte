<script lang="ts">
	let {
		placeholder = 'Ask Galaxy AI anything...',
		disabled = false,
		canRetry = false,
		onSend
	}: {
		placeholder?: string;
		disabled?: boolean;
		canRetry?: boolean;
		onSend?: (content: string) => void;
	} = $props();

	let content = $state('');

	const canSend = $derived(!disabled && (content.trim().length > 0 || canRetry));

	function submit(): void {
		if (!canSend) {
			return;
		}

		onSend?.(content.trim());
		content = '';
	}

	function onKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			submit();
		}
	}
</script>


<form class="chat-input" onsubmit={(event) => { event.preventDefault(); submit(); }} data-testid="chat-input-form">
	<textarea
		bind:value={content}
		onkeydown={onKeyDown}
		placeholder={canRetry ? 'Press Send to retry last message…' : placeholder}
		rows="3"
		disabled={disabled}
		data-testid="chat-input-textarea"
	></textarea>
	<button type="submit" disabled={!canSend} data-testid="chat-input-send" class:retry={canRetry && content.trim().length === 0}>
		{canRetry && content.trim().length === 0 ? 'Retry' : 'Send'}
	</button>
</form>

<style>
	.chat-input {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.75rem;
		padding: 0.8rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.65);
		border: 1px solid rgba(255, 255, 255, 0.85);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	textarea {
		width: 100%;
		resize: none;
		font: inherit;
		padding: 0.75rem 0.85rem;
		border-radius: 0.8rem;
		border: 1px solid rgba(201, 194, 228, 0.9);
		background: rgba(250, 250, 250, 0.95);
		color: var(--text-primary, #2d2d3a);
	}

	textarea:focus {
		outline: 2px solid rgba(255, 107, 139, 0.35);
		outline-offset: 2px;
	}

	button {
		align-self: end;
		border: none;
		padding: 0.72rem 1.15rem;
		border-radius: 0.8rem;
		font-weight: 700;
		color: #fff;
		cursor: pointer;
		background: linear-gradient(
			135deg,
			var(--accent-primary, #ff6b8b),
			var(--accent-secondary, #f4a836)
		);
		transition: transform 0.15s ease, opacity 0.15s ease;
	}

	button:hover:enabled {
		transform: translateY(-1px);
	}

	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	button.retry {
		background: linear-gradient(
			135deg,
			rgba(124, 110, 248, 0.9),
			rgba(82, 130, 255, 0.9)
		);
	}

	@media (max-width: 700px) {
		.chat-input {
			grid-template-columns: 1fr;
		}

		button {
			width: 100%;
		}
	}
</style>
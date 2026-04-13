<script lang="ts">
	type MessageRole = 'user' | 'assistant' | 'system';

	let {
		role,
		content,
		pending = false
	}: {
		role: MessageRole;
		content: string;
		pending?: boolean;
	} = $props();
</script>

<article
	class={`bubble ${role} ${pending ? 'pending' : ''}`}
	data-testid={`message-bubble-${role}`}
	aria-live={pending ? 'polite' : undefined}
>
	<p>{content}</p>
</article>

<style>
	.bubble {
		max-width: min(78%, 680px);
		padding: 0.75rem 1rem;
		border-radius: 1rem;
		line-height: 1.5;
		font-size: 0.95rem;
		box-shadow: var(--shadow-card);
		word-break: break-word;
	}

	.bubble p {
		margin: 0;
		white-space: pre-wrap;
	}

	.bubble.user {
		margin-left: auto;
		color: #2f1631;
		background: linear-gradient(
			135deg,
			rgba(255, 107, 139, 0.9) 0%,
			rgba(244, 168, 54, 0.82) 100%
		);
		border: 1px solid rgba(255, 255, 255, 0.55);
	}

	.bubble.assistant,
	.bubble.system {
		margin-right: auto;
		color: var(--text-primary, #2d2d3a);
		background: rgba(255, 255, 255, 0.68);
		border: 1px solid rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
	}

	.bubble.system {
		font-size: 0.88rem;
		opacity: 0.9;
	}

	.bubble.pending {
		animation: pendingPulse 1.5s ease-in-out infinite;
	}

	@keyframes pendingPulse {
		0%,
		100% {
			opacity: 0.85;
		}
		50% {
			opacity: 1;
		}
	}
</style>
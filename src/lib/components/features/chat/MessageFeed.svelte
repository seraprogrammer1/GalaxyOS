<script lang="ts">
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	import MessageBubble from './MessageBubble.svelte';

	type MessageRole = 'user' | 'assistant' | 'system';

	interface ChatMessage {
		role: MessageRole;
		content: string;
	}

	let {
		messages = [],
		showTyping = false
	}: {
		messages?: ChatMessage[];
		showTyping?: boolean;
	} = $props();

	let feedEl: HTMLElement | undefined;
	const messageCount = $derived(messages.length + (showTyping ? 1 : 0));

	$effect(() => {
		messageCount;
		if (feedEl) {
			feedEl.scrollTop = feedEl.scrollHeight;
		}
	});
</script>

<section class="message-feed glass" bind:this={feedEl} data-testid="chat-message-feed">
	{#if messages.length === 0 && !showTyping}
		<p class="empty-state">Start the conversation to see responses appear here.</p>
	{/if}

	{#each messages as message, idx (`${message.role}-${idx}-${message.content}`)}
		<MessageBubble role={message.role} content={message.content} />
	{/each}

	{#if showTyping}
		<div class="typing-row" data-testid="chat-typing">
			<div class="typing-spinner"><LoadingSpinner size={18} /></div>
			<MessageBubble role="assistant" content="Assistant is typing..." pending={true} />
		</div>
	{/if}
</section>

<style>
	.message-feed {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 1rem;
		border-radius: 1rem;
		overflow-y: auto;
		min-height: 0;
	}

	.empty-state {
		margin: auto;
		font-size: 0.95rem;
		color: var(--text-muted, #a0a0c0);
	}

	.typing-row {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.typing-spinner {
		margin-left: 0.2rem;
		margin-bottom: 0.35rem;
	}
</style>
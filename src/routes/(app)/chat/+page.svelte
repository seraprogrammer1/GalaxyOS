<script lang="ts">
	import { untrack } from 'svelte';
	import ChatInput from '$lib/components/features/chat/ChatInput.svelte';
	import MessageFeed from '$lib/components/features/chat/MessageFeed.svelte';

	type MessageRole = 'user' | 'assistant' | 'system';

	interface ChatMessage {
		role: MessageRole;
		content: string;
	}

	interface ChatThread {
		_id: string;
		title: string;
		messages?: ChatMessage[];
	}

	let activeChatId = $state('');
	let messages = $state<ChatMessage[]>([]);
	let bootLoading = $state(true);
	let sending = $state(false);
	let error = $state('');

	$effect(() => {
		untrack(() => {
			void loadOrCreateChat();
		});
	});

	async function loadOrCreateChat(): Promise<void> {
		bootLoading = true;
		error = '';

		try {
			const listRes = await fetch('/api/chats');
			if (!listRes.ok) {
				throw new Error('Failed to load chats');
			}

			const threads = (await listRes.json()) as ChatThread[];
			if (threads.length > 0) {
				activeChatId = threads[0]._id;
				messages = threads[0].messages ?? [];
				return;
			}

			const createRes = await fetch('/api/chats', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: 'New Chat' })
			});

			if (!createRes.ok) {
				throw new Error('Failed to create chat');
			}

			const created = (await createRes.json()) as ChatThread;
			activeChatId = created._id;
			messages = created.messages ?? [];
		} catch {
			error = 'Unable to initialize chat.';
		} finally {
			bootLoading = false;
		}
	}

	async function handleSend(userContent: string): Promise<void> {
		if (!activeChatId || sending) {
			return;
		}

		messages = [...messages, { role: 'user', content: userContent }];
		sending = true;
		error = '';

		try {
			const response = await fetch(`/api/chats/${activeChatId}/message`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: userContent })
			});

			if (!response.ok) {
				throw new Error('Failed to send message');
			}

			const payload = (await response.json()) as { message?: string };
			if (payload.message) {
				messages = [...messages, { role: 'assistant', content: payload.message }];
			}
		} catch {
			messages = [
				...messages,
				{ role: 'assistant', content: 'I could not process that request. Please try again.' }
			];
			error = 'Message failed. Please retry.';
		} finally {
			sending = false;
		}
	}
</script>

<section class="chat-page" data-testid="chat-page">
	<header class="chat-header">
		<h2>AI Chat</h2>
		<p>Light Cosmic conversation workspace.</p>
	</header>

	<div class="chat-shell">
		<MessageFeed {messages} showTyping={sending} />
		<ChatInput disabled={bootLoading || !activeChatId || sending} onSend={handleSend} />
	</div>

	{#if bootLoading}
		<p class="status-msg">Preparing your chat thread...</p>
	{:else if error}
		<p class="status-msg error" data-testid="chat-error">{error}</p>
	{/if}
</section>

<style>
	.chat-page {
		height: 100%;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-md, 12px);
		background:
			radial-gradient(1200px 500px at 100% -120px, rgba(244, 168, 54, 0.14), transparent 60%),
			radial-gradient(900px 440px at 0% 115%, rgba(255, 107, 139, 0.14), transparent 55%),
			var(--bg-glass, rgba(255, 255, 255, 0.6));
		backdrop-filter: var(--blur-glass);
		-webkit-backdrop-filter: var(--blur-glass);
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
	}

	.chat-header h2 {
		margin: 0;
		font-size: 1.35rem;
	}

	.chat-header p {
		margin: 0.2rem 0 0;
		color: var(--text-muted, #a0a0c0);
	}

	.chat-shell {
		height: 100%;
		min-height: 0;
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		gap: 0.75rem;
	}

	.status-msg {
		margin: 0;
		font-size: 0.86rem;
		color: var(--text-muted, #a0a0c0);
	}

	.status-msg.error {
		color: #b2294f;
	}
</style>

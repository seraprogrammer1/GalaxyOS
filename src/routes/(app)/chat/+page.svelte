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

	let threads = $state<ChatThread[]>([]);
	let activeChatId = $state('');
	let bootLoading = $state(true);
	let sending = $state(false);
	let error = $state('');
	let renamingId = $state<string | null>(null);
	let renameText = $state('');
	let panelOpen = $state(true);

	let messages = $derived(threads.find((t) => t._id === activeChatId)?.messages ?? []);
	const canRetry = $derived(messages.length > 0 && messages[messages.length - 1]?.role === 'user');

	$effect(() => {
		untrack(() => {
			void loadThreads();
		});
	});

	async function loadThreads(): Promise<void> {
		bootLoading = true;
		error = '';
		try {
			const res = await fetch('/api/chats');
			if (!res.ok) throw new Error('Failed to load chats');
			const data = (await res.json()) as ChatThread[];
			threads = data;
			if (threads.length > 0) {
				selectThread(threads[0]._id);
			} else {
				await createThread();
			}
		} catch {
			error = 'Unable to load chats.';
		} finally {
			bootLoading = false;
		}
	}

	function selectThread(id: string): void {
		activeChatId = id;
	}

	async function createThread(): Promise<void> {
		try {
			const res = await fetch('/api/chats', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: 'New Chat' })
			});
			if (!res.ok) throw new Error('Failed to create chat');
			const created = (await res.json()) as ChatThread;
			threads = [created, ...threads];
			selectThread(created._id);
		} catch {
			error = 'Unable to create chat.';
		}
	}

	async function deleteThread(id: string): Promise<void> {
		try {
			await fetch(`/api/chats/${id}`, { method: 'DELETE' });
			const idx = threads.findIndex((t) => t._id === id);
			threads = threads.filter((t) => t._id !== id);
			if (activeChatId === id) {
				if (threads.length > 0) {
					selectThread(threads[Math.min(idx, threads.length - 1)]._id);
				} else {
					await createThread();
				}
			}
		} catch {
			error = 'Unable to delete chat.';
		}
	}

	function startRename(id: string, title: string): void {
		renamingId = id;
		renameText = title;
	}

	function cancelRename(): void {
		renamingId = null;
		renameText = '';
	}

	async function confirmRename(): Promise<void> {
		if (!renamingId || !renameText.trim()) {
			cancelRename();
			return;
		}
		const id = renamingId;
		const title = renameText.trim();
		cancelRename();
		try {
			const res = await fetch(`/api/chats/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title })
			});
			if (!res.ok) throw new Error('Failed to rename');
			threads = threads.map((t) => (t._id === id ? { ...t, title } : t));
		} catch {
			error = 'Unable to rename chat.';
		}
	}

	async function handleSend(userContent: string): Promise<void> {
		if (!activeChatId || sending) return;
		// Retry mode: empty content means re-send the last user message without appending it again
		let isRetry = false;
		if (userContent === '') {
			const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
			if (!lastUserMsg) return;
			userContent = lastUserMsg.content;
			isRetry = true;
		}
		if (!isRetry) {
			const newMsg: ChatMessage = { role: 'user', content: userContent };
			threads = threads.map((t) =>
				t._id === activeChatId ? { ...t, messages: [...(t.messages ?? []), newMsg] } : t
			);
		}
		sending = true;
		error = '';
		try {
			const res = await fetch(`/api/chats/${activeChatId}/message`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: userContent })
			});
			if (!res.ok) throw new Error('Failed to send message');
			const payload = (await res.json()) as { message?: string };
			if (payload.message) {
				const assistantMsg: ChatMessage = { role: 'assistant', content: payload.message };
				threads = threads.map((t) =>
					t._id === activeChatId
						? { ...t, messages: [...(t.messages ?? []), assistantMsg] }
						: t
				);
			}
		} catch {
			error = 'Message failed. Please retry.';
		} finally {
			sending = false;
		}
	}

	async function patchMessages(newMessages: ChatMessage[]): Promise<void> {
		await fetch(`/api/chats/${activeChatId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messages: newMessages })
		});
	}

	async function handleDeleteMessage(idx: number): Promise<void> {
		const current = threads.find((t) => t._id === activeChatId)?.messages ?? [];
		const updated = current.slice(0, idx);
		threads = threads.map((t) => (t._id === activeChatId ? { ...t, messages: updated } : t));
		await patchMessages(updated).catch(() => {});
	}

	async function handleEditMessage(idx: number, newContent: string): Promise<void> {
		const current = threads.find((t) => t._id === activeChatId)?.messages ?? [];
		const updated = current.map((m, i) => (i === idx ? { ...m, content: newContent } : m));
		threads = threads.map((t) => (t._id === activeChatId ? { ...t, messages: updated } : t));
		await patchMessages(updated).catch(() => {});
	}

	async function handleRefreshMessage(idx: number): Promise<void> {
		if (sending) return;
		const current = threads.find((t) => t._id === activeChatId)?.messages ?? [];
		// Find the user message directly before the assistant message at idx
		const userIdx = idx > 0 && current[idx - 1]?.role === 'user' ? idx - 1 : -1;
		if (userIdx < 0) return;
		const userContent = current[userIdx].content;
		// Truncate to before the user message so the POST endpoint can re-append it cleanly
		const truncated = current.slice(0, userIdx);
		threads = threads.map((t) => (t._id === activeChatId ? { ...t, messages: truncated } : t));
		await patchMessages(truncated).catch(() => {});
		await handleSend(userContent);
	}
</script>

<section class="chat-page" data-testid="chat-page">
	<div class="chat-panel" class:collapsed={!panelOpen}>
		<div class="panel-header">
			<button
				class="new-chat-btn"
				onclick={() => void createThread()}
				disabled={bootLoading}
				aria-label="New chat"
			>
				<svg
					viewBox="0 0 24 24"
					width="13"
					height="13"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>New Chat</span>
			</button>
			<button
				class="panel-collapse-btn"
				onclick={() => (panelOpen = false)}
				aria-label="Collapse thread list"
			>
				<svg
					viewBox="0 0 24 24"
					width="15"
					height="15"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<polyline points="15 18 9 12 15 6" />
				</svg>
			</button>
		</div>

		<ul class="thread-list">
			{#if bootLoading && threads.length === 0}
				<p class="panel-loading">Loading…</p>
			{:else}
				{#each threads as thread (thread._id)}
					<li class="thread-item" class:active={activeChatId === thread._id}>
						{#if renamingId === thread._id}
							<!-- svelte-ignore a11y_autofocus -->
							<input
								class="rename-input"
								type="text"
								bind:value={renameText}
								autofocus
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										void confirmRename();
									}
									if (e.key === 'Escape') cancelRename();
								}}
							/>
							<button
								class="rename-confirm-btn"
								onmousedown={(e) => e.preventDefault()}
								onclick={() => void confirmRename()}
								aria-label="Confirm rename"
							>
								<svg
									viewBox="0 0 24 24"
									width="11"
									height="11"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							</button>
							<button
								class="rename-cancel-btn"
								onmousedown={(e) => e.preventDefault()}
								onclick={cancelRename}
								aria-label="Cancel rename"
							>
								<svg
									viewBox="0 0 24 24"
									width="11"
									height="11"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						{:else}
							<button
								class="thread-select-btn"
								onclick={() => selectThread(thread._id)}
								ondblclick={() => startRename(thread._id, thread.title)}
							>
								<span class="thread-title">{thread.title}</span>
							</button>
							<button
								class="thread-rename-btn"
								onclick={() => startRename(thread._id, thread.title)}
								aria-label="Rename chat"
							>
								<svg
									viewBox="0 0 24 24"
									width="12"
									height="12"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
								</svg>
							</button>
							<button
								class="thread-delete-btn"
								onclick={(e) => {
									e.stopPropagation();
									void deleteThread(thread._id);
								}}
								aria-label="Delete chat"
							>
								<svg
									viewBox="0 0 24 24"
									width="12"
									height="12"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<polyline points="3 6 5 6 21 6" />
									<path d="M19 6l-1 14H6L5 6" />
									<path d="M10 11v6M14 11v6" />
									<path d="M9 6V4h6v2" />
								</svg>
							</button>
						{/if}
					</li>
				{/each}
			{/if}
		</ul>
	</div>

	<div class="chat-main">
		{#if !panelOpen}
			<button
				class="panel-expand-btn"
				onclick={() => (panelOpen = true)}
				aria-label="Open thread list"
				title="Open thread list"
			>
				<svg
					viewBox="0 0 24 24"
					width="16"
					height="16"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="3" y1="12" x2="21" y2="12" />
					<line x1="3" y1="18" x2="21" y2="18" />
				</svg>
			</button>
		{/if}

		<div class="chat-shell">
			<MessageFeed
				{messages}
				showTyping={sending}
				onDeleteMessage={handleDeleteMessage}
				onEditMessage={handleEditMessage}
				onRefreshMessage={handleRefreshMessage}
			/>
			<ChatInput disabled={bootLoading || !activeChatId || sending} canRetry={canRetry} onSend={handleSend} />
		</div>

		{#if bootLoading}
			<p class="status-msg">Preparing your chat thread...</p>
		{:else if error}
			<p class="status-msg error" data-testid="chat-error">{error}</p>
		{/if}
	</div>
</section>

<style>
	.chat-page {
		height: 100%;
		display: flex;
		flex-direction: row;
		border-radius: var(--radius-md, 12px);
		background:
			radial-gradient(1200px 500px at 100% -120px, rgba(244, 168, 54, 0.14), transparent 60%),
			radial-gradient(900px 440px at 0% 115%, rgba(255, 107, 139, 0.14), transparent 55%),
			var(--bg-glass, rgba(255, 255, 255, 0.6));
		backdrop-filter: var(--blur-glass);
		-webkit-backdrop-filter: var(--blur-glass);
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
		overflow: hidden;
	}

	/* ── Thread panel ── */

	.chat-panel {
		width: 220px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		border-right: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.04);
		transition: width 0.2s ease;
		overflow: hidden;
	}

	.chat-panel.collapsed {
		width: 0;
		border-right-width: 0;
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.75rem 0.6rem 0.5rem;
		flex-shrink: 0;
	}

	.new-chat-btn {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.6rem;
		border-radius: var(--radius-sm, 8px);
		background: var(--accent-primary, #7c6ef8);
		color: white;
		border: none;
		cursor: pointer;
		font-size: 0.78rem;
		font-weight: 600;
		white-space: nowrap;
		transition: opacity 0.15s;
	}

	.new-chat-btn:hover {
		opacity: 0.88;
	}

	.new-chat-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.panel-collapse-btn {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm, 8px);
		border: none;
		background: transparent;
		color: var(--text-secondary, #8888aa);
		cursor: pointer;
		transition: background 0.15s;
	}

	.panel-collapse-btn:hover {
		background: rgba(0, 0, 0, 0.07);
	}

	.thread-list {
		flex: 1;
		overflow-y: auto;
		list-style: none;
		padding: 0.2rem 0 0.5rem;
		margin: 0;
	}

	.panel-loading {
		font-size: 0.82rem;
		color: var(--text-muted, #a0a0c0);
		padding: 0.5rem 1rem;
		margin: 0;
	}

	.thread-item {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		padding: 0 0.35rem;
		min-height: 34px;
		border-radius: var(--radius-sm, 8px);
		margin: 0.1rem 0.4rem;
	}

	.thread-item.active {
		background: rgba(124, 110, 248, 0.12);
	}

	.thread-item:hover .thread-rename-btn,
	.thread-item:hover .thread-delete-btn {
		opacity: 1;
	}

	.thread-select-btn {
		flex: 1;
		min-width: 0;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem 0.3rem;
		overflow: hidden;
	}

	.thread-title {
		font-size: 0.82rem;
		color: var(--text-primary, #1a1a2e);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: block;
	}

	.thread-rename-btn,
	.thread-delete-btn {
		opacity: 0;
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: none;
		border-radius: 4px;
		cursor: pointer;
		color: var(--text-secondary, #8888aa);
		padding: 0;
		transition: opacity 0.15s;
	}

	.thread-delete-btn:hover {
		color: #b2294f;
		background: rgba(178, 41, 79, 0.1);
	}

	.thread-rename-btn:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	.rename-input {
		flex: 1;
		min-width: 0;
		font-size: 0.82rem;
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		border: 1px solid var(--input-border, rgba(0, 0, 0, 0.14));
		background: var(--bg-input, rgba(255, 255, 255, 0.92));
		color: var(--text-primary, #1a1a2e);
		outline: none;
	}

	.rename-confirm-btn,
	.rename-cancel-btn {
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		padding: 0;
	}

	.rename-confirm-btn {
		background: rgba(46, 155, 100, 0.15);
		color: #2e9b64;
	}

	.rename-cancel-btn {
		background: transparent;
		color: var(--text-secondary, #8888aa);
	}

	/* ── Main chat area ── */

	.chat-main {
		flex: 1;
		min-width: 0;
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		gap: 0.5rem;
		padding: 1rem;
		position: relative;
	}

	.chat-shell {
		height: 100%;
		min-height: 0;
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		gap: 0.75rem;
	}

	.panel-expand-btn {
		position: absolute;
		top: 1rem;
		left: 0.5rem;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: var(--radius-sm, 8px);
		background: var(--bg-surface, rgba(255, 255, 255, 0.7));
		cursor: pointer;
		color: var(--text-secondary, #8888aa);
		z-index: 1;
		transition: background 0.15s;
	}

	.panel-expand-btn:hover {
		background: var(--bg-glass, rgba(255, 255, 255, 0.85));
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

<script lang="ts">
	interface ChatThread {
		id: string;
		name: string;
		lastMessage: string;
		time: string;
		unread: number;
	}

	let {
		threads = [
			{
				id: '1',
				name: 'System Prompt Assistant',
				lastMessage: 'Your prompt has been optimized.',
				time: '2m ago',
				unread: 2
			},
			{
				id: '2',
				name: 'Zillow Scraper Bot',
				lastMessage: 'Found 14 new listings in Austin.',
				time: '15m ago',
				unread: 0
			},
			{
				id: '3',
				name: 'Code Review Agent',
				lastMessage: 'PR #42 looks good to merge.',
				time: '1h ago',
				unread: 1
			}
		]
	}: { threads?: ChatThread[] } = $props();
</script>

<section class="chats-widget glass" data-testid="recent-chats-widget">
	<div class="widget-header">
		<h3>Recent Chats</h3>
		<a href="/chat" class="view-all">View All</a>
	</div>

	{#if threads.length === 0}
		<p class="state-msg empty">No chats yet.</p>
	{:else}
		<ul class="chat-list">
			{#each threads as thread (thread.id)}
				<li class="chat-item" data-testid="chat-thread">
					<div class="chat-avatar">
						{thread.name.charAt(0)}
					</div>
					<div class="chat-content">
						<div class="chat-top">
							<span class="chat-name">{thread.name}</span>
							<span class="chat-time">{thread.time}</span>
						</div>
						<p class="chat-preview">{thread.lastMessage}</p>
					</div>
					{#if thread.unread > 0}
						<span class="unread-badge">{thread.unread}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.chats-widget {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		border-radius: var(--radius-md, 12px);
		padding: 1.5rem;
		box-shadow: var(--shadow-card);
	}

	.widget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
		position: sticky;
		top: 0;
		z-index: 2;
		background: var(--bg-glass, rgba(255, 255, 255, 0.6));
		backdrop-filter: var(--blur-glass);
		-webkit-backdrop-filter: var(--blur-glass);
		padding-bottom: 0.5rem;
	}

	h3 {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary, #2d2d3a);
		margin: 0;
	}

	.view-all {
		font-size: 0.8rem;
		color: var(--accent-primary, #ff6b8b);
		text-decoration: none;
		font-weight: 600;
	}

	.view-all:hover {
		text-decoration: underline;
	}

	.chat-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding-right: 0.35rem;
	}

	.chat-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: var(--radius-sm, 8px);
		background: var(--bg-surface, #f0eef8);
		transition: background 0.2s ease;
	}

	.chat-item:hover {
		background: var(--bg-glass-border, rgba(255, 255, 255, 0.85));
	}

	.chat-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(
			135deg,
			var(--accent-primary, #ff6b8b),
			var(--accent-secondary, #f4a836)
		);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.chat-content {
		flex: 1;
		min-width: 0;
	}

	.chat-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}

	.chat-name {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--text-primary, #2d2d3a);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chat-time {
		font-size: 0.7rem;
		color: var(--text-muted, #a0a0c0);
		flex-shrink: 0;
	}

	.chat-preview {
		font-size: 0.8rem;
		color: var(--text-secondary, #6b6b8a);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin: 0;
	}

	.unread-badge {
		background: var(--accent-primary, #ff6b8b);
		color: #fff;
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		flex-shrink: 0;
	}

	.state-msg.empty {
		color: var(--text-muted, #a0a0c0);
		font-size: 0.9rem;
		text-align: center;
		padding: 1.5rem 0;
	}
</style>

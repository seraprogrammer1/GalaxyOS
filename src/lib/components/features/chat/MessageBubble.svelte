<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { expandAtShortcut } from '$lib/utils/expandShortcuts';

	type MessageRole = 'user' | 'assistant' | 'system';

	let {
		role,
		content,
		pending = false,
		senderName,
		charName,
		userName,
		variants,
		activeVariant,
		generatingVariant = false,
		onDelete,
		onEdit,
		onRefresh,
		onSwitchVariant,
		onGenerateVariant
	}: {
		role: MessageRole;
		content: string;
		pending?: boolean;
		senderName?: string;
		charName?: string;
		userName?: string;
		variants?: { content: string; tail: unknown[] }[];
		activeVariant?: number;
		generatingVariant?: boolean;
		onDelete?: () => void;
		onEdit?: (newContent: string) => void;
		onRefresh?: () => void;
		onSwitchVariant?: (delta: -1 | 1) => void;
		onGenerateVariant?: () => void;
	} = $props();

	const variantCount = $derived(variants?.length ?? 0);
	const currentVariant = $derived(activeVariant ?? 0);

	let editing = $state(false);
	let editContent = $state('');

	/** Replace {{char}}, <char>, {{user}}, <user> macros with resolved names for display. */
	const displayContent = $derived.by(() => {
		let s = content;
		if (charName) {
			s = s.split('{{char}}').join(charName);
			s = s.split('<char>').join(charName);
		}
		if (userName) {
			s = s.split('{{user}}').join(userName);
			s = s.split('<user>').join(userName);
		}
		return s;
	});

	const renderedHtml = $derived.by(() => {
		if (role === 'user') return '';
		const raw = marked.parse(displayContent, { async: false }) as string;
		return typeof window !== 'undefined' ? DOMPurify.sanitize(raw) : raw;
	});

	function startEdit() {
		editContent = content;
		editing = true;
	}

	function confirmEdit() {
		const trimmed = editContent.trim();
		if (trimmed) onEdit?.(trimmed);
		editing = false;
	}

	function cancelEdit() {
		editing = false;
	}
</script>

<div class="bubble-wrap {role}">
	{#if senderName}
		<span class="bubble-sender-name">{senderName}</span>
	{/if}
	{#if editing}
		<div class="edit-container">
			<!-- svelte-ignore a11y_autofocus -->
			<textarea
				class="edit-textarea"
				bind:value={editContent}
				rows={3}
				autofocus
				onkeydown={(e) => {
					const shortcut = expandAtShortcut(editContent, e.key);
					if (shortcut) { e.preventDefault(); editContent = shortcut.newContent + shortcut.insert; return; }
					if (e.key === 'Escape') cancelEdit();
					if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) confirmEdit();
				}}
			></textarea>
			<div class="edit-btns">
				<button class="edit-save-btn" onclick={confirmEdit}>Save</button>
				<button class="edit-cancel-btn" onclick={cancelEdit}>Cancel</button>
			</div>
		</div>
	{:else}
		<article
			class={`bubble ${role} ${pending ? 'pending' : ''}`}
			data-testid={`message-bubble-${role}`}
			aria-live={pending ? 'polite' : undefined}
		>
			{#if role === 'user'}
				<p>{displayContent}</p>
			{:else}
				<div class="md-body">{@html renderedHtml}</div>
			{/if}

			{#if role === 'assistant' && variantCount > 0 && !pending}
				<div class="variant-nav" aria-label="Message variants">
					<button
						class="variant-btn"
						disabled={currentVariant === 0 || generatingVariant}
						onclick={() => onSwitchVariant?.(-1)}
						aria-label="Previous variant"
						title="Previous variant"
					>
						<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
					</button>
					<span class="variant-counter">{currentVariant + 1} / {variantCount}</span>
					{#if generatingVariant}
						<span class="variant-spinner" aria-label="Generating…">
							<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
						</span>
					{:else if currentVariant < variantCount - 1}
						<button
							class="variant-btn"
							onclick={() => onSwitchVariant?.(1)}
							aria-label="Next variant"
							title="Next variant"
						>
							<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
						</button>
					{:else}
						<button
							class="variant-btn generate-btn"
							onclick={() => onGenerateVariant?.()}
							aria-label="Generate new variant"
							title="Generate new variant"
						>
							<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.85"/></svg>
						</button>
					{/if}
				</div>
			{/if}
		</article>
	{/if}

	{#if !pending && !editing && (onDelete || onEdit || onRefresh)}
		<div class="bubble-actions">
			{#if role === 'user' && onEdit}
				<button class="action-btn" onclick={startEdit} aria-label="Edit message" title="Edit message">
					<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
					</svg>
				</button>
			{/if}
			{#if role !== 'user' && onRefresh}
				<button class="action-btn" onclick={onRefresh} aria-label="Regenerate response" title="Regenerate response">
					<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<polyline points="1 4 1 10 7 10" />
						<path d="M3.51 15a9 9 0 1 0 .49-3.85" />
					</svg>
				</button>
			{/if}
			{#if onDelete}
				<button class="action-btn delete-btn" onclick={onDelete} aria-label="Delete message" title="Delete message">
					<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6l-1 14H6L5 6" />
						<path d="M10 11v6M14 11v6" />
						<path d="M9 6V4h6v2" />
					</svg>
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.bubble-wrap {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2rem;
	}

	.bubble-sender-name {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-secondary, #8888aa);
		padding: 0 0.2rem;
		letter-spacing: 0.01em;
	}

	.bubble-wrap.user .bubble-sender-name {
		color: var(--accent-primary, #7c6ef8);
	}

	.bubble-wrap.user {
		align-items: flex-end;
	}

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

	/* ── Markdown body (assistant/system bubbles) ── */

	.md-body {
		line-height: 1.6;
	}

	.md-body :global(p) {
		margin: 0 0 0.55em;
	}

	.md-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.md-body :global(h1),
	.md-body :global(h2),
	.md-body :global(h3),
	.md-body :global(h4) {
		margin: 0.75em 0 0.3em;
		font-weight: 700;
		line-height: 1.3;
	}

	.md-body :global(h1) { font-size: 1.15em; }
	.md-body :global(h2) { font-size: 1.05em; }
	.md-body :global(h3) { font-size: 0.97em; }

	.md-body :global(ul),
	.md-body :global(ol) {
		margin: 0.3em 0 0.55em;
		padding-left: 1.4em;
	}

	.md-body :global(li) {
		margin-bottom: 0.2em;
	}

	.md-body :global(code) {
		font-family: 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
		font-size: 0.87em;
		background: rgba(0, 0, 0, 0.07);
		border-radius: 4px;
		padding: 0.1em 0.35em;
	}

	.md-body :global(pre) {
		margin: 0.5em 0;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.07);
		padding: 0.75em 1em;
		overflow-x: auto;
	}

	.md-body :global(pre code) {
		background: none;
		padding: 0;
		font-size: 0.85em;
	}

	.md-body :global(blockquote) {
		margin: 0.4em 0;
		padding-left: 0.9em;
		border-left: 3px solid rgba(0, 0, 0, 0.18);
		color: var(--text-secondary, #8888aa);
		font-style: italic;
	}

	.md-body :global(a) {
		color: var(--accent-primary, #7c6ef8);
		text-decoration: underline;
	}

	.md-body :global(hr) {
		border: none;
		border-top: 1px solid rgba(0, 0, 0, 0.12);
		margin: 0.6em 0;
	}

	.md-body :global(table) {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.9em;
		margin: 0.5em 0;
	}

	.md-body :global(th),
	.md-body :global(td) {
		border: 1px solid rgba(0, 0, 0, 0.15);
		padding: 0.3em 0.6em;
		text-align: left;
	}

	.md-body :global(th) {
		background: rgba(0, 0, 0, 0.05);
		font-weight: 700;
	}

	.md-body :global(strong) { font-weight: 700; }
	.md-body :global(em) { font-style: italic; }

	.bubble.user {
		color: #fff;
		background: linear-gradient(
			135deg,
			rgba(124, 110, 248, 0.92) 0%,
			rgba(92, 80, 218, 0.85) 100%
		);
		border: 1px solid rgba(155, 140, 255, 0.4);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
	}

	.bubble.assistant,
	.bubble.system {
		color: var(--text-primary, #2d2d3a);
		background: rgba(255, 255, 255, 0.94);
		border: 1px solid rgba(200, 190, 230, 0.5);
		box-shadow: 0 2px 8px rgba(140, 120, 200, 0.1);
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

	/* ── Action toolbar ── */

	.bubble-actions {
		display: flex;
		gap: 0.2rem;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.bubble-wrap:hover .bubble-actions {
		opacity: 1;
	}

	.action-btn {
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		background: rgba(255, 255, 255, 0.72);
		color: var(--text-secondary, #8888aa);
		cursor: pointer;
		padding: 0;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition:
			background 0.12s,
			color 0.12s;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.95);
		color: var(--text-primary, #2d2d3a);
	}

	.action-btn.delete-btn:hover {
		background: rgba(178, 41, 79, 0.1);
		color: #b2294f;
		border-color: rgba(178, 41, 79, 0.2);
	}

	/* ── Inline edit ── */

	.edit-container {
		width: min(78%, 680px);
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.edit-textarea {
		width: 100%;
		padding: 0.6rem 0.8rem;
		border-radius: 0.75rem;
		border: 1px solid var(--input-border, rgba(0, 0, 0, 0.14));
		background: var(--bg-input, rgba(255, 255, 255, 0.92));
		color: var(--text-primary, #1a1a2e);
		font-size: 0.95rem;
		line-height: 1.5;
		resize: vertical;
		font-family: inherit;
		outline: none;
		box-sizing: border-box;
	}

	.edit-textarea:focus {
		border-color: var(--accent-primary, #7c6ef8);
		box-shadow: 0 0 0 3px rgba(124, 110, 248, 0.15);
	}

	.edit-btns {
		display: flex;
		gap: 0.4rem;
		justify-content: flex-end;
	}

	.edit-save-btn,
	.edit-cancel-btn {
		padding: 0.28rem 0.75rem;
		border-radius: var(--radius-sm, 8px);
		border: none;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 600;
	}

	.edit-save-btn {
		background: var(--accent-primary, #7c6ef8);
		color: white;
	}

	.edit-save-btn:hover {
		opacity: 0.88;
	}

	.edit-cancel-btn {
		background: rgba(0, 0, 0, 0.06);
		color: var(--text-secondary, #8888aa);
	}

	.edit-cancel-btn:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	/* ── Variant navigation ── */

	.variant-nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.5rem;
		padding-top: 0.4rem;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		justify-content: flex-end;
	}

	.variant-counter {
		font-size: 0.7rem;
		color: var(--text-secondary, #8888aa);
		min-width: 2.4rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.variant-btn {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.08);
		background: rgba(255, 255, 255, 0.6);
		color: var(--text-secondary, #8888aa);
		cursor: pointer;
		padding: 0;
		transition: background 0.12s, color 0.12s;
	}

	.variant-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.92);
		color: var(--text-primary, #2d2d3a);
	}

	.variant-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.variant-btn.generate-btn:hover:not(:disabled) {
		color: var(--accent-primary, #7c6ef8);
		border-color: rgba(124, 110, 248, 0.3);
	}

	.variant-spinner {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent-primary, #7c6ef8);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.spin {
		animation: spin 0.8s linear infinite;
	}
</style>
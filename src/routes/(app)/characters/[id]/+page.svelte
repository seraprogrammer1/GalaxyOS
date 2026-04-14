<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	type Character = {
		_id: string;
		name: string;
		nickname: string;
		description: string;
		personality: string;
		scenario: string;
		example_dialogue: string;
		first_message: string;
		alternate_greetings: string[];
		system_prompt: string;
		post_history_instructions: string;
		creator_notes: string;
		tags: string[];
		avatar_url: string;
		linked_lorebook_id: string | null;
		source: string;
		source_id: string;
		spec: string;
		visible: boolean;
		created_at: string;
		updated_at: string;
	};

	const characterId = $derived($page.params.id);

	let char = $state<Character | null>(null);
	let loading = $state(true);
	let loadError = $state('');

	// ── Edit mode ───────────────────────────────────────────────────────────
	let editing = $state(false);
	let saving = $state(false);
	let saveError = $state('');

	type EditForm = {
		name: string;
		nickname: string;
		description: string;
		personality: string;
		scenario: string;
		example_dialogue: string;
		first_message: string;
		altGreetingsStr: string;
		system_prompt: string;
		post_history_instructions: string;
		creator_notes: string;
		tagsStr: string;
		avatar_url: string;
		visible: boolean;
	};

	let editForm = $state<EditForm>({
		name: '',
		nickname: '',
		description: '',
		personality: '',
		scenario: '',
		example_dialogue: '',
		first_message: '',
		altGreetingsStr: '',
		system_prompt: '',
		post_history_instructions: '',
		creator_notes: '',
		tagsStr: '',
		avatar_url: '',
		visible: true
	});

	// ── Detail tab ──────────────────────────────────────────────────────────
	let activeTab = $state('overview');

	// ── Actions ─────────────────────────────────────────────────────────────
	let startingChat = $state(false);
	let confirmDelete = $state(false);

	$effect(() => {
		if (characterId) {
			void loadCharacter();
		}
	});

	async function loadCharacter(): Promise<void> {
		loading = true;
		loadError = '';
		try {
			const res = await fetch(`/api/characters/${characterId}`);
			if (res.status === 404) {
				await goto('/characters');
				return;
			}
			if (!res.ok) throw new Error();
			char = (await res.json()) as Character;
		} catch {
			loadError = 'Unable to load character.';
		} finally {
			loading = false;
		}
	}

	function startEdit(): void {
		if (!char) return;
		editForm = {
			name: char.name,
			nickname: char.nickname,
			description: char.description,
			personality: char.personality,
			scenario: char.scenario,
			example_dialogue: char.example_dialogue,
			first_message: char.first_message,
			altGreetingsStr: char.alternate_greetings.join('\n'),
			system_prompt: char.system_prompt,
			post_history_instructions: char.post_history_instructions,
			creator_notes: char.creator_notes,
			tagsStr: char.tags.join(', '),
			avatar_url: char.avatar_url,
			visible: char.visible
		};
		saveError = '';
		editing = true;
	}

	async function saveEdit(): Promise<void> {
		if (!char || !editForm.name.trim()) return;
		saving = true;
		saveError = '';
		try {
			const res = await fetch(`/api/characters/${char._id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editForm.name.trim(),
					nickname: editForm.nickname,
					description: editForm.description,
					personality: editForm.personality,
					scenario: editForm.scenario,
					example_dialogue: editForm.example_dialogue,
					first_message: editForm.first_message,
					alternate_greetings: editForm.altGreetingsStr
						.split('\n')
						.map((s) => s.trim())
						.filter(Boolean),
					system_prompt: editForm.system_prompt,
					post_history_instructions: editForm.post_history_instructions,
					creator_notes: editForm.creator_notes,
					tags: editForm.tagsStr
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean),
					avatar_url: editForm.avatar_url,
					visible: editForm.visible
				})
			});
			if (!res.ok) throw new Error();
			char = (await res.json()) as Character;
			editing = false;
		} catch {
			saveError = 'Failed to save changes.';
		} finally {
			saving = false;
		}
	}

	async function deleteChar(): Promise<void> {
		if (!char) return;
		const res = await fetch(`/api/characters/${char._id}`, { method: 'DELETE' });
		if (res.ok) {
			await goto('/characters');
		}
	}

	async function startChat(): Promise<void> {
		if (!char) return;
		startingChat = true;
		try {
			const res = await fetch('/api/chats', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ character_id: char._id })
			});
			if (!res.ok) throw new Error();
			const chat = (await res.json()) as { _id: string };
			await goto(`/chat?id=${chat._id}`);
		} catch {
			startingChat = false;
		}
	}
</script>

{#if loading}
	<div class="loading-screen">Loading…</div>
{:else if loadError}
	<div class="error-screen">
		<p>{loadError}</p>
		<a href="/characters" class="back-link">← Back to Characters</a>
	</div>
{:else if char}
	<section class="char-detail" data-testid="character-detail">
		<!-- ── Nav bar ─────────────────────────────────────────────────────── -->
		<div class="char-nav">
			<a href="/characters" class="back-link">← Characters</a>
			<div class="char-actions">
				{#if editing}
					{#if saveError}
						<span class="save-error">{saveError}</span>
					{/if}
					<button class="btn-secondary" onclick={() => (editing = false)} disabled={saving}>
						Cancel
					</button>
					<button
						class="btn-primary"
						onclick={saveEdit}
						disabled={saving || !editForm.name.trim()}
					>
						{saving ? 'Saving…' : 'Save Changes'}
					</button>
				{:else}
					<button class="btn-chat" onclick={startChat} disabled={startingChat}>
						{startingChat ? 'Starting…' : `Chat with ${char.name}`}
					</button>
					<button class="btn-secondary" onclick={startEdit}>Edit</button>
					<button class="btn-danger-outline" onclick={() => (confirmDelete = true)}>Delete</button>
				{/if}
			</div>
		</div>

		<!-- ── Body ───────────────────────────────────────────────────────── -->
		<div class="char-body">
			<!-- Left: avatar + meta -->
			<div class="char-sidebar">
				<div class="avatar-frame">
					{#if editing}
						{#if editForm.avatar_url}
							<img class="avatar-img" src={editForm.avatar_url} alt="Preview" />
						{:else}
							<div class="avatar-placeholder">
								{editForm.name.slice(0, 2).toUpperCase() || '?'}
							</div>
						{/if}
						<div class="form-row mt-sm">
							<label for="edit-avatar-url">Avatar URL</label>
							<input id="edit-avatar-url" bind:value={editForm.avatar_url} placeholder="https://…" />
						</div>
					{:else if char.avatar_url}
						<img class="avatar-img" src={char.avatar_url} alt={char.name} />
					{:else}
						<div class="avatar-placeholder">{char.name.slice(0, 2).toUpperCase()}</div>
					{/if}
				</div>

				{#if !editing}
					<div class="char-meta-list">
						{#if char.source !== 'manual'}
							<div class="meta-item">
								<span class="meta-label">Source</span>
								<span class="meta-value source-badge-inline">{char.source}</span>
							</div>
						{/if}
						<div class="meta-item">
							<span class="meta-label">Updated</span>
							<span class="meta-value">{new Date(char.updated_at).toLocaleDateString()}</span>
						</div>
						{#if char.linked_lorebook_id}
							<div class="meta-item">
								<span class="meta-label">Lorebook</span>
								<span class="meta-value">Linked</span>
							</div>
						{/if}
						{#if char.spec !== 'custom'}
							<div class="meta-item">
								<span class="meta-label">Spec</span>
								<span class="meta-value">{char.spec}</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Right: details -->
			<div class="char-main">
				<!-- Name + nickname -->
				{#if editing}
					<input class="name-input" bind:value={editForm.name} placeholder="Character name" />
					<input
						class="nickname-input"
						bind:value={editForm.nickname}
						placeholder="Nickname (used in &#123;&#123;char&#125;&#125; macro)"
					/>
				{:else}
					<h1 class="char-name">{char.name}</h1>
					{#if char.nickname}
						<p class="char-nickname">"{char.nickname}"</p>
					{/if}
				{/if}

				<!-- Tags -->
				<div class="tags-row">
					{#if editing}
						<div class="form-row" style="width:100%">
							<label for="edit-tags">Tags <small>comma-separated</small></label>
							<input id="edit-tags" bind:value={editForm.tagsStr} placeholder="fantasy, female, warrior" />
						</div>
					{:else}
						{#each char.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
						{#if char.tags.length === 0}
							<span class="no-tags">No tags</span>
						{/if}
					{/if}
				</div>

				<!-- Detail tabs -->
				<div class="detail-tab-bar">
					{#each [['overview', 'Overview'], ['personality', 'Personality'], ['scenario', 'Scenario'], ['dialogue', 'Dialogue'], ['greetings', 'Greetings'], ['prompts', 'Prompts']] as [t, label]}
						<button
							class="detail-tab"
							class:active={activeTab === t}
							onclick={() => (activeTab = t)}
						>
							{label}
						</button>
					{/each}
				</div>

				<div class="detail-content">
					{#if activeTab === 'overview'}
						{#if editing}
							<textarea
								bind:value={editForm.description}
								rows="9"
								placeholder="Physical appearance, background, backstory…"
							></textarea>
						{:else}
							<div class="text-block">{char.description || 'No description.'}</div>
						{/if}

					{:else if activeTab === 'personality'}
						{#if editing}
							<textarea
								bind:value={editForm.personality}
								rows="9"
								placeholder="Traits, quirks, speech style, mannerisms…"
							></textarea>
						{:else}
							<div class="text-block">{char.personality || 'No personality defined.'}</div>
						{/if}

					{:else if activeTab === 'scenario'}
						{#if editing}
							<textarea
								bind:value={editForm.scenario}
								rows="6"
								placeholder="Setting, context, current situation…"
							></textarea>
						{:else}
							<div class="text-block">{char.scenario || 'No scenario defined.'}</div>
						{/if}

					{:else if activeTab === 'dialogue'}
						{#if editing}
							<textarea
								bind:value={editForm.example_dialogue}
								rows="10"
								placeholder={'<START>\n{{user}}: Hello\n{{char}}: Hi there!'}
							></textarea>
						{:else}
							<pre class="text-block mono">{char.example_dialogue || 'No example dialogue.'}</pre>
						{/if}

					{:else if activeTab === 'greetings'}
						<div class="greetings-section">
							<h3>Opening Greeting</h3>
							{#if editing}
								<textarea
									bind:value={editForm.first_message}
									rows="4"
									placeholder="Character's opening message…"
								></textarea>
							{:else}
								<div class="text-block greeting-block">
									{char.first_message || 'No greeting set.'}
								</div>
							{/if}

							{#if editing || char.alternate_greetings.length > 0}
								<h3>Alternate Greetings <small>one per line</small></h3>
								{#if editing}
									<textarea
										bind:value={editForm.altGreetingsStr}
										rows="5"
										placeholder="Alternative greeting…&#10;Another variant…"
									></textarea>
								{:else}
									{#each char.alternate_greetings as g, i}
										<div class="alt-greeting">
											<span class="alt-label">Greeting {i + 2}</span>
											<div class="text-block greeting-block">{g}</div>
										</div>
									{/each}
								{/if}
							{/if}
						</div>

					{:else if activeTab === 'prompts'}
						<div class="prompts-section">
							<h3>System Prompt Override</h3>
							{#if editing}
								<textarea
									bind:value={editForm.system_prompt}
									rows="5"
									placeholder="Overrides the global system prompt for this character…"
								></textarea>
							{:else}
								<div class="text-block">
									{char.system_prompt || 'Using global system prompt.'}
								</div>
							{/if}

							<h3>Post-History Instructions</h3>
							{#if editing}
								<textarea
									bind:value={editForm.post_history_instructions}
									rows="3"
									placeholder="Injected just before AI response…"
								></textarea>
							{:else}
								<div class="text-block">{char.post_history_instructions || 'None.'}</div>
							{/if}

							{#if char.creator_notes || editing}
								<h3>Creator Notes <small>private, not shown to AI</small></h3>
								{#if editing}
									<textarea
										bind:value={editForm.creator_notes}
										rows="3"
										placeholder="Private notes about this character…"
									></textarea>
								{:else}
									<div class="text-block creator-notes">{char.creator_notes}</div>
								{/if}
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- ── Delete confirm modal ─────────────────────────────────────────── -->
	{#if confirmDelete}
		<div
			class="modal-backdrop"
			onclick={() => (confirmDelete = false)}
			role="presentation"
		>
			<!-- svelte-ignore a11y_interactive_supports_focus -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="modal"
				onclick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label="Confirm delete"
				tabindex="-1"
			>
				<div class="modal-header">
					<h2>Delete {char.name}?</h2>
				</div>
				<div class="modal-body">
					<p>This will permanently delete this character. This action cannot be undone.</p>
				</div>
				<div class="modal-footer">
					<button class="btn-secondary" onclick={() => (confirmDelete = false)}>Cancel</button>
					<button class="btn-danger" onclick={deleteChar}>Delete</button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	/* ── Loading / error ── */
	.loading-screen,
	.error-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 60%;
		gap: 1rem;
		color: var(--text-secondary, #6b6b8a);
	}

	/* ── Nav bar ── */
	.char-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.back-link {
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--text-secondary, #6b6b8a);
		text-decoration: none;
		transition: color 0.15s;
	}

	.back-link:hover {
		color: var(--accent-primary, #ff6b8b);
	}

	.char-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.save-error {
		font-size: 0.8rem;
		color: #e74c3c;
	}

	/* ── Body layout ── */
	.char-body {
		display: flex;
		gap: 1.5rem;
		min-height: 0;
		height: calc(100% - 3rem);
	}

	/* ── Left sidebar ── */
	.char-sidebar {
		flex: 0 0 240px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.avatar-frame {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.avatar-img {
		width: 100%;
		aspect-ratio: 3 / 4;
		object-fit: cover;
		border-radius: var(--radius-md, 12px);
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
	}

	.avatar-placeholder {
		width: 100%;
		aspect-ratio: 3 / 4;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3.5rem;
		font-weight: 800;
		color: var(--text-secondary, #6b6b8a);
		background: linear-gradient(
			135deg,
			var(--accent-primary-soft, rgba(255, 107, 139, 0.15)),
			var(--accent-secondary-soft, rgba(244, 168, 54, 0.15))
		);
		border-radius: var(--radius-md, 12px);
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
	}

	.char-meta-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.meta-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.8rem;
	}

	.meta-label {
		color: var(--text-secondary, #6b6b8a);
		font-weight: 600;
	}

	.meta-value {
		color: var(--text-primary, #2d2d3a);
	}

	.source-badge-inline {
		background: var(--accent-primary-soft, rgba(255, 107, 139, 0.15));
		color: var(--accent-primary, #ff6b8b);
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
		text-transform: uppercase;
	}

	/* ── Right main ── */
	.char-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
		overflow-y: auto;
	}

	.char-name {
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--text-primary, #2d2d3a);
		line-height: 1.2;
	}

	.char-nickname {
		font-size: 1rem;
		color: var(--text-secondary, #6b6b8a);
		font-style: italic;
		margin-top: -0.4rem;
	}

	.name-input {
		font-size: 1.5rem;
		font-weight: 800;
		background: var(--bg-surface, #f0eef8);
		border: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
		border-radius: var(--radius-sm, 8px);
		padding: 0.45rem 0.75rem;
		color: var(--text-primary, #2d2d3a);
		width: 100%;
		box-sizing: border-box;
	}

	.nickname-input {
		font-size: 0.92rem;
		background: var(--bg-surface, #f0eef8);
		border: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
		border-radius: var(--radius-sm, 8px);
		padding: 0.4rem 0.75rem;
		color: var(--text-secondary, #6b6b8a);
		width: 100%;
		box-sizing: border-box;
	}

	.name-input:focus,
	.nickname-input:focus {
		outline: none;
		border-color: var(--accent-primary, #ff6b8b);
	}

	.tags-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-items: center;
	}

	.tag {
		font-size: 0.75rem;
		background: var(--accent-primary-soft, rgba(255, 107, 139, 0.15));
		color: var(--accent-primary, #ff6b8b);
		border-radius: 999px;
		padding: 0.2rem 0.6rem;
		font-weight: 600;
	}

	.no-tags {
		font-size: 0.8rem;
		color: var(--text-secondary, #6b6b8a);
	}

	/* ── Detail tab bar ── */
	.detail-tab-bar {
		display: flex;
		gap: 0.1rem;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
		padding-bottom: 0;
	}

	.detail-tab {
		background: none;
		border: none;
		padding: 0.45rem 0.85rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary, #6b6b8a);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition: color 0.15s, border-color 0.15s;
	}

	.detail-tab:hover {
		color: var(--text-primary, #2d2d3a);
	}

	.detail-tab.active {
		color: var(--accent-primary, #ff6b8b);
		border-bottom-color: var(--accent-primary, #ff6b8b);
	}

	/* ── Detail content ── */
	.detail-content {
		flex: 1;
		min-height: 0;
	}

	.detail-content textarea {
		width: 100%;
		background: var(--bg-surface, #f0eef8);
		border: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
		border-radius: var(--radius-sm, 8px);
		padding: 0.65rem 0.85rem;
		font-size: 0.88rem;
		font-family: inherit;
		color: var(--text-primary, #2d2d3a);
		resize: vertical;
		box-sizing: border-box;
	}

	.detail-content textarea:focus {
		outline: none;
		border-color: var(--accent-primary, #ff6b8b);
	}

	.text-block {
		background: var(--bg-glass, rgba(255, 255, 255, 0.6));
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
		border-radius: var(--radius-sm, 8px);
		padding: 0.85rem 1rem;
		font-size: 0.9rem;
		color: var(--text-primary, #2d2d3a);
		line-height: 1.65;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.text-block.mono {
		font-family: 'Courier New', monospace;
		font-size: 0.82rem;
	}

	.text-block.creator-notes {
		color: var(--text-secondary, #6b6b8a);
		font-style: italic;
	}

	.greeting-block {
		background: linear-gradient(
			135deg,
			var(--accent-primary-soft, rgba(255, 107, 139, 0.08)),
			var(--accent-secondary-soft, rgba(244, 168, 54, 0.08))
		);
	}

	/* ── Greetings section ── */
	.greetings-section,
	.prompts-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.greetings-section h3,
	.prompts-section h3 {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--text-secondary, #6b6b8a);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.greetings-section h3 small,
	.prompts-section h3 small {
		text-transform: none;
		letter-spacing: 0;
		font-weight: 400;
		margin-left: 0.35rem;
	}

	.alt-greeting {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.alt-label {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-secondary, #6b6b8a);
	}

	/* ── Shared form row ── */
	.form-row {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.form-row label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary, #6b6b8a);
	}

	.form-row label small {
		font-weight: 400;
		margin-left: 0.25rem;
	}

	.form-row input {
		background: var(--bg-surface, #f0eef8);
		border: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
		border-radius: var(--radius-sm, 8px);
		padding: 0.45rem 0.7rem;
		font-size: 0.88rem;
		color: var(--text-primary, #2d2d3a);
		width: 100%;
		box-sizing: border-box;
	}

	.form-row input:focus {
		outline: none;
		border-color: var(--accent-primary, #ff6b8b);
	}

	.mt-sm {
		margin-top: 0.5rem;
	}

	/* ── Buttons ── */
	.btn-chat {
		background: linear-gradient(135deg, rgba(124, 110, 248, 0.9), rgba(82, 130, 255, 0.9));
		color: #fff;
		border: none;
		border-radius: var(--radius-sm, 8px);
		padding: 0.55rem 1.25rem;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.15s, transform 0.1s;
	}

	.btn-chat:hover {
		opacity: 0.92;
		transform: translateY(-1px);
	}

	.btn-chat:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		transform: none;
	}

	.btn-primary {
		background: linear-gradient(
			135deg,
			var(--accent-primary, #ff6b8b),
			var(--accent-secondary, #f4a836)
		);
		color: #fff;
		border: none;
		border-radius: var(--radius-sm, 8px);
		padding: 0.55rem 1.1rem;
		font-size: 0.88rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.btn-primary:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: var(--bg-surface, #f0eef8);
		color: var(--text-primary, #2d2d3a);
		border: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.1));
		border-radius: var(--radius-sm, 8px);
		padding: 0.55rem 1.1rem;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-secondary:hover {
		background: var(--bg-glass, rgba(255, 255, 255, 0.9));
	}

	.btn-secondary:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.btn-danger {
		background: #e74c3c;
		color: #fff;
		border: none;
		border-radius: var(--radius-sm, 8px);
		padding: 0.55rem 1.1rem;
		font-size: 0.88rem;
		font-weight: 700;
		cursor: pointer;
	}

	.btn-danger-outline {
		background: none;
		color: #e74c3c;
		border: 1px solid #e74c3c;
		border-radius: var(--radius-sm, 8px);
		padding: 0.55rem 1.1rem;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-danger-outline:hover {
		background: rgba(231, 76, 60, 0.08);
	}

	/* ── Modal ── */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(4px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal {
		background: var(--bg-glass, rgba(255, 255, 255, 0.95));
		backdrop-filter: blur(20px);
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.9));
		border-radius: var(--radius-md, 12px);
		width: 100%;
		max-width: 400px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
	}

	.modal-header {
		padding: 1rem 1.25rem 0.75rem;
		border-bottom: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
	}

	.modal-header h2 {
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary, #2d2d3a);
	}

	.modal-body {
		padding: 1rem 1.25rem;
	}

	.modal-body p {
		font-size: 0.9rem;
		color: var(--text-secondary, #6b6b8a);
		line-height: 1.5;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem 1rem;
		border-top: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
	}
</style>

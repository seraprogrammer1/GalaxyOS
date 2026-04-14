<script lang="ts">
	import { goto } from '$app/navigation';

	type CharacterSummary = {
		_id: string;
		name: string;
		nickname: string;
		description: string;
		avatar_url: string;
		tags: string[];
		source: string;
		updated_at: string;
	};

	type LoreEntry = {
		name: string;
		keywords: string[];
		content: string;
		enabled: boolean;
		constant: boolean;
		use_regex: boolean;
		priority: number;
		exclude_keys: string[];
		additional_keys: string[];
	};

	type LorebookFull = {
		_id: string;
		title: string;
		description: string;
		entries: LoreEntry[];
		scan_depth: number;
		token_budget: number;
		recursive_scanning: boolean;
		updated_at: string;
	};

	// ── Tab ──────────────────────────────────────────────────────────────────
	let activeTab = $state<'characters' | 'lorebooks'>('characters');

	// ── Characters ───────────────────────────────────────────────────────────
	let characters = $state<CharacterSummary[]>([]);
	let charsLoading = $state(true);
	let charsError = $state('');

	// ── Lorebooks ────────────────────────────────────────────────────────────
	let lorebooks = $state<LorebookFull[]>([]);
	let lbLoading = $state(true);
	let lbError = $state('');
	let expandedLbId = $state<string | null>(null);
	let lbSavingId = $state<string | null>(null);
	let lbDeletingId = $state<string | null>(null);

	// ── Create character modal ───────────────────────────────────────────────
	let showCreateChar = $state(false);
	let createCharTab = $state<'basic' | 'persona' | 'dialogue' | 'prompts'>('basic');
	let charSaving = $state(false);
	let createCharError = $state('');

	// ── AI character generation ──────────────────────────────────────────────
	let generateDesc = $state('');
	let generateLorebook = $state(false);
	let generating = $state(false);
	let generateError = $state('');
	let generateExpanded = $state(false);
	// Lorebook data returned from generation — applied after character is created
	let pendingLorebook = $state<{ title: string; entries: unknown[] } | null>(null);

	const defaultCharForm = () => ({
		name: '',
		nickname: '',
		description: '',
		personality: '',
		scenario: '',
		example_dialogue: '',
		first_message: '',
		alternate_greetings: '',
		system_prompt: '',
		post_history_instructions: '',
		creator_notes: '',
		tags: '',
		avatar_url: ''
	});
	let charForm = $state(defaultCharForm());

	// ── Create lorebook modal ────────────────────────────────────────────────
	let showCreateLb = $state(false);
	let lbForm = $state({ title: '', description: '' });
	let lbCreating = $state(false);

	// ── Delete confirm ───────────────────────────────────────────────────────
	let confirmDeleteCharId = $state<string | null>(null);

	$effect(() => {
		void loadCharacters();
		void loadLorebooks();
	});

	async function loadCharacters(): Promise<void> {
		charsLoading = true;
		charsError = '';
		try {
			const res = await fetch('/api/characters');
			if (!res.ok) throw new Error();
			characters = (await res.json()) as CharacterSummary[];
		} catch {
			charsError = 'Unable to load characters.';
		} finally {
			charsLoading = false;
		}
	}

	async function loadLorebooks(): Promise<void> {
		lbLoading = true;
		lbError = '';
		try {
			const res = await fetch('/api/lorebooks');
			if (!res.ok) throw new Error();
			lorebooks = (await res.json()) as LorebookFull[];
		} catch {
			lbError = 'Unable to load lorebooks.';
		} finally {
			lbLoading = false;
		}
	}

	async function generateCharacter(): Promise<void> {
		if (!generateDesc.trim() || generating) return;
		generating = true;
		generateError = '';
		pendingLorebook = null;
		try {
			const res = await fetch('/api/characters/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: generateDesc.trim(),
					generate_lorebook: generateLorebook
				})
			});
			const data = (await res.json()) as {
				character?: Record<string, unknown>;
				lorebook?: { title: string; entries: unknown[] } | null;
				lorebook_skipped?: boolean;
				error?: string;
				stage?: string;
			};
			if (!res.ok) {
				const stageMsg: Record<string, string> = {
					sanitize: 'Chub AI failed to process the description.',
					'sanitize-loop': 'AI loop exceeded limit — try simplifying the description.',
					fill: 'Failed to format character data — try again.',
					'fill-parse': 'AI returned malformed data — try again.',
					'fill-unavailable': 'Gemini is overloaded and the fallback also failed — please try again in a moment.',
					network: 'AI service is unreachable.',
					input: 'Description is required.'
				};
				generateError = stageMsg[data.stage ?? ''] ?? data.error ?? 'Generation failed.';
				return;
			}
			if (!data.character) { generateError = 'No character data returned.'; return; }
			const c = data.character;
			charForm = {
				name: typeof c.name === 'string' ? c.name : '',
				nickname: typeof c.nickname === 'string' ? c.nickname : '',
				description: typeof c.description === 'string' ? c.description : '',
				personality: typeof c.personality === 'string' ? c.personality : '',
				scenario: typeof c.scenario === 'string' ? c.scenario : '',
				example_dialogue: typeof c.example_dialogue === 'string' ? c.example_dialogue : '',
				first_message: typeof c.first_message === 'string' ? c.first_message : '',
				alternate_greetings: Array.isArray(c.alternate_greetings)
					? (c.alternate_greetings as string[]).join('\n')
					: '',
				system_prompt: typeof c.system_prompt === 'string' ? c.system_prompt : '',
				post_history_instructions: '',
				creator_notes: '',
				tags: Array.isArray(c.tags) ? (c.tags as string[]).join(', ') : '',
				avatar_url: ''
			};
			if (data.lorebook && !data.lorebook_skipped) pendingLorebook = data.lorebook;
			createCharTab = 'basic';
			generateExpanded = false;
			if (data.lorebook_skipped) {
				createCharError = 'Note: lorebook could not be generated but character data is ready.';
			}
		} catch {
			generateError = 'Unexpected error during generation.';
		} finally {
			generating = false;
		}
	}

	async function createCharacter(): Promise<void> {
		if (!charForm.name.trim()) return;
		charSaving = true;
		createCharError = '';
		try {
			const res = await fetch('/api/characters', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...charForm,
					tags: charForm.tags
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean),
					alternate_greetings: charForm.alternate_greetings
						.split('\n')
						.map((s) => s.trim())
						.filter(Boolean)
				})
			});
			if (!res.ok) throw new Error('Failed to create');
			const created = (await res.json()) as CharacterSummary;
			// If generation produced a lorebook, create it and link it now
			if (pendingLorebook) {
				try {
					const lbRes = await fetch('/api/lorebooks', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							title: pendingLorebook.title,
							entries: pendingLorebook.entries
						})
					});
					if (lbRes.ok) {
						const lb = (await lbRes.json()) as { _id: string };
						await fetch(`/api/characters/${created._id}`, {
							method: 'PATCH',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ linked_lorebook_id: lb._id })
						});
					}
				} catch { /* lorebook link is non-fatal */ }
				pendingLorebook = null;
			}
			showCreateChar = false;
			await goto(`/characters/${created._id}`);
		} catch {
			createCharError = 'Failed to create character.';
		} finally {
			charSaving = false;
		}
	}

	async function deleteCharacter(id: string): Promise<void> {
		const res = await fetch(`/api/characters/${id}`, { method: 'DELETE' });
		if (res.ok) {
			characters = characters.filter((c) => c._id !== id);
		}
		confirmDeleteCharId = null;
	}

	async function createLorebook(): Promise<void> {
		if (!lbForm.title.trim()) return;
		lbCreating = true;
		try {
			const res = await fetch('/api/lorebooks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(lbForm)
			});
			if (!res.ok) throw new Error();
			const created = (await res.json()) as LorebookFull;
			lorebooks = [created, ...lorebooks];
			showCreateLb = false;
			lbForm = { title: '', description: '' };
			expandedLbId = created._id;
		} catch {
			// ignore
		} finally {
			lbCreating = false;
		}
	}

	async function saveLorebook(lb: LorebookFull): Promise<void> {
		lbSavingId = lb._id;
		try {
			const res = await fetch(`/api/lorebooks/${lb._id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: lb.title,
					description: lb.description,
					entries: lb.entries,
					scan_depth: lb.scan_depth,
					token_budget: lb.token_budget,
					recursive_scanning: lb.recursive_scanning
				})
			});
			if (!res.ok) throw new Error();
			const updated = (await res.json()) as LorebookFull;
			lorebooks = lorebooks.map((l) => (l._id === lb._id ? updated : l));
		} catch {
			// ignore
		} finally {
			lbSavingId = null;
		}
	}

	async function deleteLorebook(id: string): Promise<void> {
		lbDeletingId = id;
		const res = await fetch(`/api/lorebooks/${id}`, { method: 'DELETE' });
		if (res.ok) {
			lorebooks = lorebooks.filter((l) => l._id !== id);
			if (expandedLbId === id) expandedLbId = null;
		}
		lbDeletingId = null;
	}

	function addEntry(lbId: string): void {
		lorebooks = lorebooks.map((lb) =>
			lb._id !== lbId
				? lb
				: {
						...lb,
						entries: [
							...lb.entries,
							{
								name: '',
								keywords: [],
								content: '',
								enabled: true,
								constant: false,
								use_regex: false,
								priority: 0,
								exclude_keys: [],
								additional_keys: []
							}
						]
					}
		);
	}

	function removeEntry(lbId: string, idx: number): void {
		lorebooks = lorebooks.map((lb) =>
			lb._id !== lbId ? lb : { ...lb, entries: lb.entries.filter((_, i) => i !== idx) }
		);
	}

	function updateEntryKeywords(lbId: string, idx: number, raw: string): void {
		const keywords = raw
			.split(',')
			.map((k) => k.trim())
			.filter(Boolean);
		lorebooks = lorebooks.map((lb) =>
			lb._id !== lbId
				? lb
				: { ...lb, entries: lb.entries.map((e, i) => (i === idx ? { ...e, keywords } : e)) }
		);
	}
	// ── Import ──────────────────────────────────────────────────────────────
	let importing = $state(false);
	let importError = $state('');
	let fileInputEl = $state<HTMLInputElement | null>(null);

	async function handleImport(e: Event): Promise<void> {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		importing = true;
		importError = '';
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/characters/import/file', { method: 'POST', body: fd });
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { message?: string };
				importError = body.message ?? 'Import failed';
				return;
			}
			const created = (await res.json()) as { _id: string };
			await goto(`/characters/${created._id}`);
		} catch {
			importError = 'Unexpected error during import.';
		} finally {
			importing = false;
		}
	}
</script>

<section class="characters-page" data-testid="characters-page">
	<!-- Page header -->
	<div class="page-header">
		<h1>Characters</h1>
		<div class="header-actions">
			<!-- Hidden file input for import -->
			<input
				bind:this={fileInputEl}
				type="file"
				accept=".png,.json"
				style="display:none"
				onchange={handleImport}
			/>
			{#if activeTab === 'characters'}
				<button
					class="btn-secondary"
					onclick={() => fileInputEl?.click()}
					disabled={importing}
				>
					{importing ? 'Importing…' : 'Import Card'}
				</button>
				<button
					class="btn-primary"
					onclick={() => {
						charForm = defaultCharForm();
						createCharTab = 'basic';
						createCharError = '';
						generateDesc = '';
						generateLorebook = false;
						generateError = '';
						generateExpanded = false;
						pendingLorebook = null;
						showCreateChar = true;
					}}
				>
					New Character
				</button>
			{:else}
				<button class="btn-primary" onclick={() => (showCreateLb = true)}>New Lorebook</button>
			{/if}
		</div>
	</div>

	{#if importError}
		<div class="import-error" role="alert">
			{importError}
			<button class="dismiss-btn" onclick={() => (importError = '')}>×</button>
		</div>
	{/if}

	<!-- Tab switcher -->
	<div class="tab-switcher">
		<button class:active={activeTab === 'characters'} onclick={() => (activeTab = 'characters')}>
			Characters
			{#if !charsLoading}<span class="tab-count">{characters.length}</span>{/if}
		</button>
		<button class:active={activeTab === 'lorebooks'} onclick={() => (activeTab = 'lorebooks')}>
			Lorebooks
			{#if !lbLoading}<span class="tab-count">{lorebooks.length}</span>{/if}
		</button>
	</div>

	<!-- ── Characters tab ─────────────────────────────────────────────────── -->
	{#if activeTab === 'characters'}
		{#if charsLoading}
			<div class="loading-state">Loading characters…</div>
		{:else if charsError}
			<p class="error-msg">{charsError}</p>
		{:else if characters.length === 0}
			<div class="empty-state">
				<div class="empty-icon">✦</div>
				<p>No characters yet.</p>
				<button
					class="btn-primary"
					onclick={() => {
						charForm = defaultCharForm();
						showCreateChar = true;
					}}>Create your first character</button
				>
			</div>
		{:else}
			<div class="char-grid">
				{#each characters as char}
					<a href="/characters/{char._id}" class="char-card" data-testid="character-card">
						<div class="char-avatar-wrap">
							{#if char.avatar_url}
								<img src={char.avatar_url} alt={char.name} class="char-avatar-img" />
							{:else}
								<div class="char-avatar-placeholder">{char.name.slice(0, 2).toUpperCase()}</div>
							{/if}
							{#if char.source !== 'manual'}
								<span class="source-badge">{char.source}</span>
							{/if}
						</div>
						<div class="char-card-info">
							<span class="char-card-name">{char.name}</span>
							{#if char.tags.length > 0}
								<div class="char-card-tags">
									{#each char.tags.slice(0, 3) as tag}
										<span class="tag">{tag}</span>
									{/each}
									{#if char.tags.length > 3}
										<span class="tag tag-more">+{char.tags.length - 3}</span>
									{/if}
								</div>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- ── Lorebooks tab ───────────────────────────────────────────────────── -->
	{#if activeTab === 'lorebooks'}
		{#if lbLoading}
			<div class="loading-state">Loading lorebooks…</div>
		{:else if lbError}
			<p class="error-msg">{lbError}</p>
		{:else if lorebooks.length === 0}
			<div class="empty-state">
				<div class="empty-icon">✦</div>
				<p>No lorebooks yet.</p>
				<button class="btn-primary" onclick={() => (showCreateLb = true)}
					>Create your first lorebook</button
				>
			</div>
		{:else}
			<div class="lorebook-list">
				{#each lorebooks as lb}
					<div class="lorebook-item" class:expanded={expandedLbId === lb._id}>
						<button
							class="lb-header"
							onclick={() => (expandedLbId = expandedLbId === lb._id ? null : lb._id)}
						>
							<div class="lb-header-left">
								<span class="lb-title">{lb.title}</span>
								<span class="lb-meta-text"
									>{lb.entries.length} {lb.entries.length === 1 ? 'entry' : 'entries'}</span
								>
							</div>
							<span class="expand-chevron">{expandedLbId === lb._id ? '▲' : '▼'}</span>
						</button>

						{#if expandedLbId === lb._id}
							<div class="lb-body">
								<!-- Settings row -->
								<div class="lb-settings">
									<div class="form-row">
										<label for="lb-{lb._id}-title">Title</label>
										<input id="lb-{lb._id}-title" bind:value={lb.title} />
									</div>
									<div class="form-row">
										<label for="lb-{lb._id}-desc">Description</label>
										<input id="lb-{lb._id}-desc" bind:value={lb.description} placeholder="Optional description…" />
									</div>
									<div class="lb-settings-row">
										<div class="form-row slim">
											<label for="lb-{lb._id}-depth">Scan Depth</label>
											<input id="lb-{lb._id}-depth" type="number" bind:value={lb.scan_depth} min="1" max="50" />
										</div>
										<div class="form-row slim">
											<label for="lb-{lb._id}-budget">Token Budget</label>
											<input id="lb-{lb._id}-budget" type="number" bind:value={lb.token_budget} min="128" />
										</div>
										<label class="toggle-label">
											<input type="checkbox" bind:checked={lb.recursive_scanning} />
											Recursive scan
										</label>
									</div>
								</div>

								<!-- Entries -->
								<div class="entries-list">
									{#each lb.entries as entry, idx}
										<div class="entry-item">
											<div class="entry-top">
												<input
													class="entry-name"
													bind:value={entry.name}
													placeholder="Entry name…"
												/>
												<input
													class="entry-keywords"
													value={entry.keywords.join(', ')}
													oninput={(e) =>
														updateEntryKeywords(
															lb._id,
															idx,
															(e.target as HTMLInputElement).value
														)}
													placeholder="keyword1, keyword2…"
												/>
												<label class="mini-toggle">
													<input type="checkbox" bind:checked={entry.enabled} />
													On
												</label>
												<label class="mini-toggle">
													<input type="checkbox" bind:checked={entry.constant} />
													Always
												</label>
												<button
													class="entry-delete-btn"
													onclick={() => removeEntry(lb._id, idx)}
													aria-label="Remove entry">×</button
												>
											</div>
											<textarea
												class="entry-content"
												bind:value={entry.content}
												rows="3"
												placeholder="Content to inject when triggered…"
											></textarea>
										</div>
									{/each}
									<button class="btn-add-entry" onclick={() => addEntry(lb._id)}>
										+ Add Entry
									</button>
								</div>

								<div class="lb-footer">
									<button
										class="btn-danger-outline btn-sm"
										onclick={() => deleteLorebook(lb._id)}
										disabled={lbDeletingId === lb._id}
									>
										{lbDeletingId === lb._id ? 'Deleting…' : 'Delete Lorebook'}
									</button>
									<button
										class="btn-primary btn-sm"
										onclick={() => saveLorebook(lb)}
										disabled={lbSavingId === lb._id}
									>
										{lbSavingId === lb._id ? 'Saving…' : 'Save'}
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</section>

<!-- ── Create Character Modal ─────────────────────────────────────────────── -->
{#if showCreateChar}
	<div class="modal-backdrop" onclick={() => (showCreateChar = false)} role="presentation">
		<!-- svelte-ignore a11y_interactive_supports_focus -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-label="New character"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2>New Character</h2>
				<button class="modal-close" onclick={() => (showCreateChar = false)}>×</button>
			</div>

			<!-- ✨ AI Generate panel -->
			<div class="gen-panel" class:expanded={generateExpanded}>
				<button
					class="gen-toggle"
					onclick={() => (generateExpanded = !generateExpanded)}
					aria-expanded={generateExpanded}
				>
					<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
					Generate with AI
					<svg class="gen-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
				</button>
				{#if generateExpanded}
					<div class="gen-body">
						<p class="gen-note">Describe the character in any level of detail — SFW or NSFW. Mature content is sanitised before reaching Gemini.</p>
						<textarea
							class="gen-textarea"
							rows="4"
							placeholder="e.g. A stoic elven ranger who guards an ancient forest… or a flirtatious vampire noble with a dark secret…"
							bind:value={generateDesc}
							disabled={generating}
						></textarea>
						<label class="gen-checkbox-label">
							<input type="checkbox" bind:checked={generateLorebook} disabled={generating} />
							Also generate a lorebook for this character
						</label>
						{#if generateError}
							<p class="gen-error">{generateError}</p>
						{/if}
						<button
							class="btn-primary gen-btn"
							onclick={() => void generateCharacter()}
							disabled={generating || !generateDesc.trim()}
						>
							{#if generating}
								<svg class="gen-spin" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
								Generating…
							{:else}
								✨ Generate
							{/if}
						</button>
					</div>
				{/if}
			</div>

			<div class="modal-tab-bar">
				{#each [['basic', 'Basic'], ['persona', 'Persona'], ['dialogue', 'Dialogue'], ['prompts', 'Prompts']] as [t, label]}
					<button
						class:active={createCharTab === t}
						onclick={() => (createCharTab = t as typeof createCharTab)}>{label}</button
					>
				{/each}
			</div>

			<div class="modal-body">
				{#if createCharTab === 'basic'}
					<div class="form-row">
						<label for="char-name">Name <span class="required">*</span></label>
						<input id="char-name" bind:value={charForm.name} placeholder="Character name" />
					</div>
					<div class="form-row">
						<label for="char-nickname">Nickname <small>used as &#123;&#123;char&#125;&#125;</small></label>
						<input id="char-nickname" bind:value={charForm.nickname} placeholder="Optional display name" />
					</div>
					<div class="form-row">
						<label for="char-avatar">Avatar URL</label>
						<input id="char-avatar" bind:value={charForm.avatar_url} placeholder="https://…" />
					</div>
					<div class="form-row">
						<label for="char-tags">Tags <small>comma-separated</small></label>
						<input id="char-tags" bind:value={charForm.tags} placeholder="fantasy, female, warrior" />
					</div>
					<div class="form-row">
						<label for="char-creator-notes">Creator Notes <small>not shown to AI</small></label>
						<textarea id="char-creator-notes" bind:value={charForm.creator_notes} rows="2" placeholder="Private notes…"
						></textarea>
					</div>
				{:else if createCharTab === 'persona'}
					<div class="form-row">
						<label for="char-description">Description</label>
						<textarea id="char-description" bind:value={charForm.description} rows="5" placeholder="Appearance, background…"
						></textarea>
					</div>
					<div class="form-row">
						<label for="char-personality">Personality</label>
						<textarea
							id="char-personality"
							bind:value={charForm.personality}
							rows="4"
							placeholder="Traits, quirks, speech style…"
						></textarea>
					</div>
					<div class="form-row">
						<label for="char-scenario">Scenario</label>
						<textarea
							id="char-scenario"
							bind:value={charForm.scenario}
							rows="3"
							placeholder="Setting, current situation…"
						></textarea>
					</div>
				{:else if createCharTab === 'dialogue'}
					<div class="form-row">
						<label for="char-first-message">Opening Greeting</label>
						<textarea
							id="char-first-message"
							bind:value={charForm.first_message}
							rows="4"
							placeholder="Character's opening message…"
						></textarea>
					</div>
					<div class="form-row">
						<label for="char-alt-greetings">Alternate Greetings <small>one per line</small></label>
						<textarea
							id="char-alt-greetings"
							bind:value={charForm.alternate_greetings}
							rows="4"
							placeholder="Alternative greeting…&#10;Another variant…"
						></textarea>
					</div>
					<div class="form-row">
						<label for="char-example-dialogue">Example Dialogue</label>
						<textarea
							id="char-example-dialogue"
							bind:value={charForm.example_dialogue}
							rows="5"
							placeholder={'<START>\n{{user}}: Hello\n{{char}}: Hi there!'}
						></textarea>
					</div>
				{:else if createCharTab === 'prompts'}
					<div class="form-row">
						<label for="char-sys-prompt">System Prompt Override</label>
						<textarea
							id="char-sys-prompt"
							bind:value={charForm.system_prompt}
							rows="4"
							placeholder="Overrides the global system prompt for this character…"
						></textarea>
					</div>
					<div class="form-row">
						<label for="char-post-history">Post-History Instructions</label>
						<textarea
							id="char-post-history"
							bind:value={charForm.post_history_instructions}
							rows="3"
							placeholder="Injected just before the AI response…"
						></textarea>
					</div>
				{/if}
			</div>

			{#if createCharError}
				<p class="modal-error">{createCharError}</p>
			{/if}

			<div class="modal-footer">
				<button class="btn-secondary" onclick={() => (showCreateChar = false)}>Cancel</button>
				<button
					class="btn-primary"
					onclick={createCharacter}
					disabled={charSaving || !charForm.name.trim()}
				>
					{charSaving ? 'Creating…' : 'Create Character'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Create Lorebook Modal ──────────────────────────────────────────────── -->
{#if showCreateLb}
	<div class="modal-backdrop" onclick={() => (showCreateLb = false)} role="presentation">
		<!-- svelte-ignore a11y_interactive_supports_focus -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
			class="modal modal-sm"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-label="New lorebook"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2>New Lorebook</h2>
				<button class="modal-close" onclick={() => (showCreateLb = false)}>×</button>
			</div>
			<div class="modal-body">
				<div class="form-row">
					<label for="lb-form-title">Title <span class="required">*</span></label>
					<input id="lb-form-title" bind:value={lbForm.title} placeholder="Lorebook title" />
				</div>
				<div class="form-row">
					<label for="lb-form-description">Description</label>
					<textarea id="lb-form-description" bind:value={lbForm.description} rows="2" placeholder="Optional description…"
					></textarea>
				</div>
			</div>
			<div class="modal-footer">
				<button class="btn-secondary" onclick={() => (showCreateLb = false)}>Cancel</button>
				<button
					class="btn-primary"
					onclick={createLorebook}
					disabled={lbCreating || !lbForm.title.trim()}
				>
					{lbCreating ? 'Creating…' : 'Create Lorebook'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Delete Character Confirm ───────────────────────────────────────────── -->
{#if confirmDeleteCharId}
	<div
		class="modal-backdrop"
		onclick={() => (confirmDeleteCharId = null)}
		role="presentation"
	>
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="modal modal-sm"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-label="Confirm delete"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2>Delete Character?</h2>
			</div>
			<div class="modal-body">
				<p>This will permanently delete the character and cannot be undone.</p>
			</div>
			<div class="modal-footer">
				<button class="btn-secondary" onclick={() => (confirmDeleteCharId = null)}>Cancel</button>
				<button class="btn-danger" onclick={() => deleteCharacter(confirmDeleteCharId!)}>Delete</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.characters-page {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		height: 100%;
		overflow-y: auto;
	}

	/* ── Header ── */
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}

	.page-header h1 {
		font-size: 1.5rem;
		font-weight: 800;
		background: linear-gradient(135deg, var(--accent-primary, #ff6b8b), var(--accent-secondary, #f4a836));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	/* ── Import error banner ── */
	.import-error {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		background: rgba(231, 76, 60, 0.12);
		border: 1px solid rgba(231, 76, 60, 0.35);
		border-radius: var(--radius-sm, 8px);
		padding: 0.6rem 0.9rem;
		font-size: 0.88rem;
		color: #c0392b;
		flex-shrink: 0;
	}

	.dismiss-btn {
		background: none;
		border: none;
		font-size: 1rem;
		color: #c0392b;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	/* ── Tab switcher ── */
	.tab-switcher {
		display: flex;
		gap: 0.25rem;
		background: var(--bg-surface, #f0eef8);
		border-radius: var(--radius-md, 12px);
		padding: 0.25rem;
		width: fit-content;
		flex-shrink: 0;
	}

	.tab-switcher button {
		background: none;
		border: none;
		padding: 0.4rem 1rem;
		border-radius: var(--radius-sm, 8px);
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--text-secondary, #6b6b8a);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		transition: background 0.15s, color 0.15s;
	}

	.tab-switcher button.active {
		background: var(--bg-glass, rgba(255, 255, 255, 0.9));
		color: var(--text-primary, #2d2d3a);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
	}

	.tab-count {
		font-size: 0.75rem;
		background: var(--accent-primary, #ff6b8b);
		color: #fff;
		border-radius: 999px;
		padding: 0 0.4rem;
		line-height: 1.4;
	}

	/* ── States ── */
	.loading-state {
		color: var(--text-secondary, #6b6b8a);
		font-size: 0.9rem;
		padding: 2rem 0;
		text-align: center;
	}

	.error-msg {
		color: #e74c3c;
		font-size: 0.88rem;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: var(--text-secondary, #6b6b8a);
		text-align: center;
	}

	.empty-icon {
		font-size: 2.5rem;
		opacity: 0.3;
	}

	/* ── Character grid ── */
	.char-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1rem;
	}

	.char-card {
		text-decoration: none;
		background: var(--bg-glass, rgba(255, 255, 255, 0.7));
		backdrop-filter: blur(12px);
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
		border-radius: var(--radius-md, 12px);
		overflow: hidden;
		transition: transform 0.15s, box-shadow 0.15s;
		display: flex;
		flex-direction: column;
	}

	.char-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
	}

	.char-avatar-wrap {
		position: relative;
		aspect-ratio: 3 / 4;
		background: var(--bg-surface, #f0eef8);
	}

	.char-avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.char-avatar-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		font-weight: 800;
		color: var(--text-secondary, #6b6b8a);
		background: linear-gradient(135deg, var(--accent-primary-soft, rgba(255,107,139,0.15)), var(--accent-secondary-soft, rgba(244,168,54,0.15)));
	}

	.source-badge {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		text-transform: uppercase;
	}

	.char-card-info {
		padding: 0.6rem 0.75rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.char-card-name {
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--text-primary, #2d2d3a);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.char-card-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	/* ── Tags ── */
	.tag {
		font-size: 0.7rem;
		background: var(--accent-primary-soft, rgba(255, 107, 139, 0.15));
		color: var(--accent-primary, #ff6b8b);
		border-radius: 999px;
		padding: 0.15rem 0.5rem;
		font-weight: 600;
	}

	.tag-more {
		background: var(--bg-surface, #f0eef8);
		color: var(--text-secondary, #6b6b8a);
	}

	/* ── Lorebook list ── */
	.lorebook-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.lorebook-item {
		background: var(--bg-glass, rgba(255, 255, 255, 0.7));
		backdrop-filter: blur(12px);
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
		border-radius: var(--radius-md, 12px);
		overflow: hidden;
	}

	.lb-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.9rem 1.1rem;
		background: none;
		border: none;
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s;
	}

	.lb-header:hover {
		background: var(--bg-surface, #f0eef8);
	}

	.lb-header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.lb-title {
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--text-primary, #2d2d3a);
	}

	.lb-meta-text {
		font-size: 0.8rem;
		color: var(--text-secondary, #6b6b8a);
	}

	.expand-chevron {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b6b8a);
	}

	.lb-body {
		padding: 0 1.1rem 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		border-top: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
	}

	.lb-settings {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding-top: 0.9rem;
	}

	.lb-settings-row {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		flex-wrap: wrap;
	}

	.form-row {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.form-row.slim {
		min-width: 100px;
		flex: 1;
	}

	.form-row label,
	.toggle-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary, #6b6b8a);
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
		padding-bottom: 0.25rem;
	}

	.form-row input,
	.form-row textarea {
		background: var(--bg-surface, #f0eef8);
		border: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
		border-radius: var(--radius-sm, 8px);
		padding: 0.5rem 0.7rem;
		font-size: 0.88rem;
		color: var(--text-primary, #2d2d3a);
		resize: vertical;
		font-family: inherit;
		width: 100%;
		box-sizing: border-box;
	}

	.form-row input:focus,
	.form-row textarea:focus {
		outline: none;
		border-color: var(--accent-primary, #ff6b8b);
	}

	/* ── Entries ── */
	.entries-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.entry-item {
		background: var(--bg-surface, #f0eef8);
		border-radius: var(--radius-sm, 8px);
		padding: 0.65rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		border: 1px solid transparent;
	}

	.entry-top {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.entry-name {
		flex: 0 0 140px;
		min-width: 120px;
		background: var(--bg-glass, rgba(255, 255, 255, 0.8));
		border: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
		border-radius: var(--radius-sm, 8px);
		padding: 0.35rem 0.6rem;
		font-size: 0.82rem;
		color: var(--text-primary, #2d2d3a);
	}

	.entry-keywords {
		flex: 1;
		min-width: 160px;
		background: var(--bg-glass, rgba(255, 255, 255, 0.8));
		border: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
		border-radius: var(--radius-sm, 8px);
		padding: 0.35rem 0.6rem;
		font-size: 0.82rem;
		color: var(--text-primary, #2d2d3a);
	}

	.entry-name:focus,
	.entry-keywords:focus {
		outline: none;
		border-color: var(--accent-primary, #ff6b8b);
	}

	.mini-toggle {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.78rem;
		color: var(--text-secondary, #6b6b8a);
		cursor: pointer;
		white-space: nowrap;
	}

	.entry-delete-btn {
		background: none;
		border: none;
		color: var(--text-secondary, #6b6b8a);
		font-size: 1.1rem;
		cursor: pointer;
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
		line-height: 1;
		transition: color 0.15s, background 0.15s;
	}

	.entry-delete-btn:hover {
		color: #e74c3c;
		background: rgba(231, 76, 60, 0.1);
	}

	.entry-content {
		width: 100%;
		background: var(--bg-glass, rgba(255, 255, 255, 0.8));
		border: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
		border-radius: var(--radius-sm, 8px);
		padding: 0.5rem 0.6rem;
		font-size: 0.82rem;
		font-family: inherit;
		color: var(--text-primary, #2d2d3a);
		resize: vertical;
		box-sizing: border-box;
	}

	.entry-content:focus {
		outline: none;
		border-color: var(--accent-primary, #ff6b8b);
	}

	.btn-add-entry {
		background: none;
		border: 1px dashed var(--bg-glass-border, rgba(0, 0, 0, 0.15));
		border-radius: var(--radius-sm, 8px);
		padding: 0.5rem 1rem;
		font-size: 0.82rem;
		color: var(--text-secondary, #6b6b8a);
		cursor: pointer;
		width: 100%;
		transition: border-color 0.15s, color 0.15s;
	}

	.btn-add-entry:hover {
		border-color: var(--accent-primary, #ff6b8b);
		color: var(--accent-primary, #ff6b8b);
	}

	.lb-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 0.25rem;
	}

	/* ── Buttons ── */
	.btn-primary {
		background: linear-gradient(135deg, var(--accent-primary, #ff6b8b), var(--accent-secondary, #f4a836));
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

	.btn-danger {
		background: #e74c3c;
		color: #fff;
		border: none;
		border-radius: var(--radius-sm, 8px);
		padding: 0.55rem 1.1rem;
		font-size: 0.88rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.15s;
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

	.btn-danger-outline:disabled,
	.btn-danger:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.btn-sm {
		padding: 0.4rem 0.85rem;
		font-size: 0.82rem;
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
		max-width: 540px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
	}

	.modal-sm {
		max-width: 380px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem 0.75rem;
		border-bottom: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
		flex-shrink: 0;
	}

	.modal-header h2 {
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary, #2d2d3a);
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.3rem;
		cursor: pointer;
		color: var(--text-secondary, #6b6b8a);
		line-height: 1;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
	}

	.modal-close:hover {
		background: var(--bg-surface, #f0eef8);
	}

	/* ✨ Generate panel */
	.gen-panel {
		margin: 0.75rem 1.25rem 0;
		border: 1px solid var(--border, #e0ddf0);
		border-radius: var(--radius, 12px);
		overflow: hidden;
		flex-shrink: 0;
	}

	.gen-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: var(--bg-surface, #f0eef8);
		border: none;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-secondary, #6b6b8a);
		text-align: left;
		transition: background 0.15s, color 0.15s;
	}

	.gen-toggle:hover {
		color: var(--primary, #7c3aed);
		background: var(--bg-hover, #ece8fa);
	}

	.gen-chevron {
		transition: transform 0.2s;
		opacity: 0.6;
	}

	.gen-chevron.expanded {
		transform: rotate(180deg);
	}

	.gen-body {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.75rem;
		border-top: 1px solid var(--border, #e0ddf0);
	}

	.gen-note {
		font-size: 0.75rem;
		color: var(--text-muted, #9992b3);
		margin: 0;
		line-height: 1.4;
	}

	.gen-textarea {
		width: 100%;
		min-height: 80px;
		resize: vertical;
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--border, #e0ddf0);
		border-radius: var(--radius-sm, 8px);
		background: var(--bg-input, #fff);
		color: var(--text-primary, #2d2d3a);
		font-size: 0.85rem;
		font-family: inherit;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}

	.gen-textarea:focus {
		outline: none;
		border-color: var(--primary, #7c3aed);
	}

	.gen-checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.82rem;
		color: var(--text-secondary, #6b6b8a);
		cursor: pointer;
		user-select: none;
	}

	.gen-error {
		font-size: 0.78rem;
		color: var(--error, #dc2626);
		margin: 0;
	}

	.gen-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		align-self: flex-start;
	}

	.gen-spin {
		animation: gen-spin 0.8s linear infinite;
	}

	@keyframes gen-spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}

	.modal-tab-bar {
		display: flex;
		gap: 0.1rem;
		padding: 0.5rem 1rem 0;
		flex-shrink: 0;
	}

	.modal-tab-bar button {
		background: none;
		border: none;
		padding: 0.4rem 0.75rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-secondary, #6b6b8a);
		cursor: pointer;
		border-radius: var(--radius-sm, 8px);
		transition: background 0.15s, color 0.15s;
	}

	.modal-tab-bar button.active {
		background: var(--bg-surface, #f0eef8);
		color: var(--text-primary, #2d2d3a);
	}

	.modal-body {
		padding: 1rem 1.25rem;
		overflow-y: auto;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.modal-body .form-row label {
		font-size: 0.82rem;
	}

	.modal-body .form-row label small {
		font-weight: 400;
		color: var(--text-secondary, #6b6b8a);
		margin-left: 0.25rem;
	}

	.required {
		color: #e74c3c;
		margin-left: 0.1rem;
	}

	.modal-error {
		padding: 0 1.25rem;
		color: #e74c3c;
		font-size: 0.82rem;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem 1rem;
		border-top: 1px solid var(--bg-glass-border, rgba(0, 0, 0, 0.08));
		flex-shrink: 0;
	}
</style>

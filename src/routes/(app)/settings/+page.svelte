<script lang="ts">
	import { untrack } from 'svelte';
	import { uiStore, type DashboardLayout, type BudgetVariant } from '$lib/stores/ui';
	import { themeStore, THEME_IDS, type ThemeId } from '$lib/stores/theme';
	import { THEMES } from '$lib/themes';

	const GEMINI_MODELS = [
		{ value: 'gemini-2.5-pro',              label: 'Gemini 2.5 Pro' },
		{ value: 'gemini-2.5-flash',             label: 'Gemini 2.5 Flash' },
		{ value: 'gemini-2.5-flash-lite',        label: 'Gemini 2.5 Flash-Lite' },
		{ value: 'gemini-3-flash-preview',       label: 'Gemini 3 Flash (Preview)' },
		{ value: 'gemini-3.1-flash-lite-preview',label: 'Gemini 3.1 Flash-Lite (Preview)' },
		{ value: 'gemini-3.1-pro-preview',       label: 'Gemini 3.1 Pro (Preview)' }
	];

	const CHUB_MODELS = [
		{ value: 'mythomax', label: 'Mythomax' },
		{ value: 'mixtral',  label: 'Mixtral' },
		{ value: 'asha',     label: 'Asha' },
		{ value: 'gemma',    label: 'Gemma' }
	];

	let layout: DashboardLayout = $state($uiStore.dashboardLayout);
	let budget: BudgetVariant = $state($uiStore.budgetVariant);
	let provider = $state<'gemini' | 'chub'>('gemini');
	let geminiModel = $state('gemini-2.5-flash');
	let chubModel = $state('mythomax');
	let theme = $state<ThemeId>($themeStore);
	let saved = $state(false);
	let settingsLoaded = $state(false);

	$effect(() => {
		untrack(() => {
			void loadSettings();
		});
	});

	async function loadSettings() {
		try {
			const res = await fetch('/api/settings');
			if (!res.ok) return;
			const data = (await res.json()) as {
				dashboard_layout?: string;
				budget_variant?: string;
				default_provider?: string;
				gemini_model?: string;
				chub_model?: string;
				theme?: string;
			};
			if (data.dashboard_layout) layout = data.dashboard_layout as DashboardLayout;
			if (data.budget_variant) budget = data.budget_variant as BudgetVariant;
			if (data.default_provider) provider = data.default_provider as 'gemini' | 'chub';
			if (data.gemini_model) geminiModel = data.gemini_model;
			if (data.chub_model) chubModel = data.chub_model;
			if (data.theme && (THEME_IDS as readonly string[]).includes(data.theme)) {
				theme = data.theme as ThemeId;
			}
		} finally {
			settingsLoaded = true;
		}
	}

	async function save() {
		uiStore.setDashboardLayout(layout);
		uiStore.setBudgetVariant(budget);
		themeStore.set(theme);
		await fetch('/api/settings', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				dashboard_layout: layout,
				budget_variant: budget,
				default_provider: provider,
				gemini_model: geminiModel,
				chub_model: chubModel,
				theme
			})
		});
		saved = true;
		setTimeout(() => (saved = false), 2500);
	}
</script>

<section class="settings-page glass" data-testid="settings-page">
	<div class="settings-header">
		<h2 class="settings-title">Settings</h2>
	</div>

	<div class="settings-body">
		<!-- Dashboard Layout -->
		<div class="field-group">
			<span class="field-label">Dashboard Layout</span>
			<div class="btn-group">
				<button
					data-testid="layout-select"
					class="opt-btn"
					class:active={layout === 'bento'}
					onclick={() => (layout = 'bento')}
				>Bento</button>
				<button
					class="opt-btn"
					class:active={layout === 'sidebar'}
					onclick={() => (layout = 'sidebar')}
				>Sidebar</button>
				<button
					class="opt-btn"
					class:active={layout === 'columns'}
					onclick={() => (layout = 'columns')}
				>Columns</button>
			</div>
		</div>

		<!-- Budget Widget Style -->
		<div class="field-group">
			<span class="field-label">Budget Widget Style</span>
			<div class="btn-group">
				<button
					data-testid="budget-variant-select"
					class="opt-btn"
					class:active={budget === 'standard'}
					onclick={() => (budget = 'standard')}
				>Standard</button>
				<button
					class="opt-btn"
					class:active={budget === 'minimal'}
					onclick={() => (budget = 'minimal')}
				>Minimal</button>
			</div>
		</div>

		<!-- Theme -->
		<div class="section-divider"></div>

		<div class="field-group">
			<span class="field-label">Theme</span>
			<div class="theme-grid">
				{#each THEME_IDS as id (id)}
					{@const def = THEMES[id]}
					<button
						class="theme-btn"
						class:active={theme === id}
						onclick={() => (theme = id)}
						aria-label={def.label}
						title={def.label}
					>
						<span class="theme-swatches">
							{#each def.swatches.slice(0, 3) as color}
								<span class="swatch" style="background:{color}"></span>
							{/each}
						</span>
						<span class="theme-label">{def.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- AI Models -->
		<div class="section-divider"></div>

		<div class="field-group">
			<span class="field-label">Default AI Provider</span>
			<div class="btn-group">
				<button
					class="opt-btn"
					class:active={provider === 'gemini'}
					onclick={() => (provider = 'gemini')}
				>Gemini</button>
				<button
					class="opt-btn"
					class:active={provider === 'chub'}
					onclick={() => (provider = 'chub')}
				>Chub AI</button>
			</div>
		</div>

		<div class="field-group">
			<label class="field-label" for="gemini-model-select">Gemini Model</label>
			<select id="gemini-model-select" class="model-select" bind:value={geminiModel}>
				{#each GEMINI_MODELS as m (m.value)}
					<option value={m.value}>{m.label}</option>
				{/each}
			</select>
		</div>

		<div class="field-group">
			<label class="field-label" for="chub-model-select">Chub AI Model</label>
			<select id="chub-model-select" class="model-select" bind:value={chubModel}>
				{#each CHUB_MODELS as m (m.value)}
					<option value={m.value}>{m.label}</option>
				{/each}
			</select>
		</div>

		<div class="actions-row">
			<button class="save-btn" onclick={() => void save()}>Save</button>
			{#if saved}
				<span class="save-msg">Saved!</span>
			{/if}
		</div>
	</div>
</section>

<style>
	.settings-page {
		height: 100%;
		padding: 1.5rem;
		border-radius: var(--radius-md, 12px);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--accent-primary-soft, rgba(232, 116, 138, 0.3)) transparent;
	}
	.settings-page::-webkit-scrollbar {
		width: 5px;
	}
	.settings-page::-webkit-scrollbar-track {
		background: transparent;
	}
	.settings-page::-webkit-scrollbar-thumb {
		background: var(--accent-primary-soft, rgba(232, 116, 138, 0.3));
		border-radius: 99px;
	}

	.settings-header {
		display: flex;
		align-items: center;
	}

	.settings-title {
		font-size: 1.1rem;
		font-weight: 700;
		background: linear-gradient(
			135deg,
			var(--accent-primary, #ff6b8b),
			var(--accent-secondary, #f4a836)
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0;
	}

	.settings-body {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.field-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary, #6b6b8a);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.btn-group {
		display: flex;
		gap: 0.4rem;
	}

	.opt-btn {
		background: var(--bg-surface, #f0eef8);
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
		color: var(--text-secondary, #6b6b8a);
		font-size: 0.85rem;
		font-weight: 500;
		padding: 0.45rem 1rem;
		border-radius: var(--radius-sm, 8px);
		cursor: pointer;
		transition: all 0.18s;
	}

	.opt-btn.active {
		background: var(--accent-primary-soft, rgba(255, 107, 139, 0.15));
		border-color: var(--accent-primary, #ff6b8b);
		color: var(--accent-primary, #ff6b8b);
		font-weight: 700;
	}

	.opt-btn:not(.active):hover {
		background: var(--bg-glass-border, rgba(255, 255, 255, 0.85));
	}

	.actions-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding-top: 0.5rem;
	}

	.save-btn {
		background: var(--accent-primary, #ff6b8b);
		border: none;
		color: #fff;
		font-size: 0.875rem;
		font-weight: 600;
		padding: 0.5rem 1.75rem;
		border-radius: var(--radius-sm, 8px);
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.save-btn:hover {
		opacity: 0.85;
	}

	.save-msg {
		font-size: 0.82rem;
		font-weight: 600;
		color: #48c78e;
	}

	.section-divider {
		border: none;
		border-top: 1px solid rgba(255, 255, 255, 0.18);
		margin: 0.25rem 0;
	}

	.model-select {
		appearance: none;
		background: var(--bg-input, rgba(255, 255, 255, 0.92));
		border: 1px solid var(--input-border, rgba(0, 0, 0, 0.14));
		border-radius: var(--radius-sm, 8px);
		color: var(--text-primary, #1a1a2e);
		font-size: 0.85rem;
		padding: 0.45rem 2rem 0.45rem 0.75rem;
		cursor: pointer;
		width: 100%;
		max-width: 260px;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888aa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.6rem center;
	}

	.theme-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.theme-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		background: var(--bg-surface, #f0eef8);
		border: 2px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
		border-radius: var(--radius-sm, 8px);
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		transition: all 0.18s;
		min-width: 80px;
	}

	.theme-btn.active {
		border-color: var(--accent-primary, #ff6b8b);
		box-shadow: 0 0 0 2px var(--accent-primary-soft, rgba(255, 107, 139, 0.25));
	}

	.theme-btn:not(.active):hover {
		border-color: var(--accent-primary, #ff6b8b);
		opacity: 0.85;
	}

	.theme-swatches {
		display: flex;
		gap: 3px;
	}

	.swatch {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		display: inline-block;
		border: 1px solid rgba(0,0,0,0.08);
	}

	.theme-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-secondary, #6b6b8a);
		white-space: nowrap;
	}

	.model-select:focus {
		outline: none;
		border-color: var(--accent-primary, #ff6b8b);
		box-shadow: 0 0 0 3px rgba(255, 107, 139, 0.15);
	}

	:global([data-theme='dark']) .model-select {
		background-color: var(--bg-surface, #1d1f29);
		border-color: var(--bg-glass-border, rgba(255, 255, 255, 0.10));
		color: var(--text-primary, #e1e1ef);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a0a0c0' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
	}
</style>

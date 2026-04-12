<script lang="ts">
	import { modalStore } from '$lib/stores/modal';

	interface Goal {
		_id?: string;
		title?: string;
		note?: string;
		category?: string;
		target_value?: number;
		current_value?: number;
		due_date?: string;
	}

	let {
		goal = null,
		onSave
	}: {
		goal?: Goal | null;
		onSave?: (data: Record<string, unknown>) => void;
	} = $props();

	let title = $state('');
	let note = $state('');
	let category = $state('');
	let target_value = $state(1);
	let due_date = $state('');
	let saving = $state(false);
	let error = $state('');

	// Populate form fields reactively whenever the goal prop changes (edit mode).
	// Using $effect instead of onMount ensures the form re-populates if the
	// prop is updated while the component is already mounted (e.g. in Storybook).
	$effect(() => {
		if (goal) {
			title = goal.title ?? '';
			note = goal.note ?? '';
			category = goal.category ?? '';
			target_value = goal.target_value ?? 1;
			due_date = goal.due_date
				? new Date(goal.due_date).toISOString().slice(0, 10)
				: '';
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';

		if (!title.trim()) {
			error = 'Title is required.';
			return;
		}

		saving = true;
		try {
			const method = goal?._id ? 'PATCH' : 'POST';
			const url = goal?._id ? `/api/goals/${goal._id}` : '/api/goals';

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					note,
					category,
					target_value,
					due_date: due_date || undefined
				})
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = (body as Record<string, string>).error ?? 'Failed to save goal.';
				return;
			}

			const saved = await res.json();
			onSave?.(saved);
			modalStore.close();
		} finally {
			saving = false;
		}
	}
</script>

<div class="goal-modal" data-testid="goal-modal">
	<h3>{goal?._id ? 'Edit Goal' : 'Add Goal'}</h3>

	{#if error}
		<p role="alert" class="error">{error}</p>
	{/if}

	<form onsubmit={handleSubmit}>
		<label>
			Title *
			<input
				type="text"
				bind:value={title}
				placeholder="What do you want to achieve?"
				data-testid="goal-title-input"
				required
			/>
		</label>

		<label>
			Note
			<textarea bind:value={note} placeholder="Optional details…" rows={3}></textarea>
		</label>

		<label>
			Category
			<input type="text" bind:value={category} placeholder="e.g. Fitness, Career…" />
		</label>

		<label>
			Target value
			<input type="number" bind:value={target_value} min={1} />
		</label>

		<label>
			Due date
			<input type="date" bind:value={due_date} />
		</label>

		<div class="actions">
			<button type="button" onclick={() => modalStore.close()}>Cancel</button>
			<button type="submit" disabled={saving}>
				{saving ? 'Saving…' : 'Save'}
			</button>
		</div>
	</form>
</div>

<style>
	.goal-modal {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	h3 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary, #2d2d3a);
		margin: 0;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.875rem;
		color: var(--text-secondary, #6b6b8a);
		font-weight: 500;
	}

	input,
	textarea {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
		border-radius: var(--radius-sm, 8px);
		background: var(--bg-surface, #f0eef8);
		color: var(--text-primary, #2d2d3a);
		font-size: 0.9rem;
		font-family: inherit;
		resize: vertical;
	}

	input:focus,
	textarea:focus {
		outline: 2px solid var(--accent-primary, #ff6b8b);
		outline-offset: 1px;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding-top: 0.5rem;
	}

	.actions button {
		padding: 0.5rem 1.25rem;
		border-radius: var(--radius-sm, 8px);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
	}

	.actions button[type='button'] {
		background: var(--bg-surface, #f0eef8);
		color: var(--text-secondary, #6b6b8a);
	}

	.actions button[type='submit'] {
		background: var(--accent-primary, #ff6b8b);
		color: #fff;
	}

	.actions button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error {
		color: #e53e3e;
		font-size: 0.85rem;
	}
</style>

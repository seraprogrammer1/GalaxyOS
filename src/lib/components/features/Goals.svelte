<script lang="ts">
        import { untrack } from 'svelte';
        import { modalStore } from '$lib/stores/modal';
        import GoalModal from '$lib/components/ui/GoalModal.svelte';
        import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';

        interface Goal {
                _id: string;
                title: string;
                note: string;
                category: string;
                completed: boolean;
                target_value: number;
                current_value: number;
                due_date?: string;
        }

        let goals = $state<Goal[]>([]);
        let loading = $state(true);
        let fetchError = $state('');
        let userSettings = $state<{ auto_delete: boolean }>({ auto_delete: false });

        // ---------------------------------------------------------------------------
        // Data fetching
        // ---------------------------------------------------------------------------
        async function fetchGoals() {
                loading = true;
                fetchError = '';
                try {
                        const res = await fetch('/api/goals');
                        if (!res.ok) throw new Error('Failed to load goals');
                        goals = await res.json();
                } catch (e) {
                        fetchError = (e as Error).message;
                } finally {
                        loading = false;
                }
        }

        // Run once on mount — using $effect because onMount callbacks are not
        // invoked during SvelteKit SSR hydration in Svelte 5 runes mode.
        $effect(() => {
                untrack(() => {
                        fetchGoals();
                        fetchSettings();
                });
        });

        // ---------------------------------------------------------------------------
        // Fetch user preferences
        // ---------------------------------------------------------------------------
        async function fetchSettings() {
                try {
                        const res = await fetch('/api/settings');
                        if (res.ok) {
                                const data = await res.json();
                                userSettings = { auto_delete: Boolean(data.auto_delete) };
                        }
                } catch {
                        // Non-critical — default (auto_delete: false) is safe
                }
        }

        // ---------------------------------------------------------------------------
        // Optimistic toggle for "completed"
        // ---------------------------------------------------------------------------
        async function toggleCompleted(goal: Goal) {
                // Keep original for rollback
                const original = goal.completed;
                // Optimistic update: flip the local state immediately
                goal.completed = !original;
                goals = goals.map((g) => (g._id === goal._id ? goal : g));

                try {
                        const res = await fetch(`/api/goals/${goal._id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ completed: goal.completed })
                        });
                        if (!res.ok) throw new Error('Patch failed');
                } catch {
                        // Revert on failure
                        goal.completed = original;
                        goals = goals.map((g) => (g._id === goal._id ? goal : g));
                }
        }

        // ---------------------------------------------------------------------------
        // Modal helpers
        // ---------------------------------------------------------------------------
        function openAddModal() {
                modalStore.open(GoalModal as never, {
                        onSave: () => {
                                fetchGoals();
                        }
                });
        }

        function openEditModal(goal: Goal) {
                modalStore.open(GoalModal as never, {
                        goal,
                        onSave: () => {
                                fetchGoals();
                        }
                });
        }

        async function deleteGoal(id: string) {
                goals = goals.filter((g) => g._id !== id);
                await fetch(`/api/goals/${id}`, { method: 'DELETE' });
        }

        // ---------------------------------------------------------------------------
        // Delete with optional confirmation
        // ---------------------------------------------------------------------------
        function requestDelete(goal: Goal) {
                // If the user has opted out of confirmation, delete immediately.
                if (userSettings.auto_delete) {
                        deleteGoal(goal._id);
                        return;
                }

                modalStore.open(ConfirmModal as never, {
                        title: 'Delete Goal',
                        message: `Delete "${goal.title}"? This cannot be undone.`,
                        showCheckbox: true,
                        onConfirm: (dontAskAgain: boolean) => {
                                if (dontAskAgain) {
                                        // Persist the preference silently in the background.
                                        userSettings = { ...userSettings, auto_delete: true };
                                        fetch('/api/settings', {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ auto_delete: true })
                                        }).catch(() => {});
                                }
                                deleteGoal(goal._id);
                                modalStore.close();
                        },
                        onCancel: () => modalStore.close()
                });
        }
</script>

<section class="goals-widget" data-testid="goals-widget">
        <div class="widget-header">
                <h3>Goals</h3>
                <button class="btn-add" onclick={openAddModal} data-testid="add-goal-btn">
                        + Add Goal
                </button>
        </div>

        {#if loading}
                <p class="state-msg">Loading goals…</p>
        {:else if fetchError}
                <p class="state-msg error" role="alert">{fetchError}</p>
        {:else if goals.length === 0}
                <p class="state-msg empty">No goals yet. Add one to get started!</p>
        {:else}
                <ul class="goals-list" data-testid="goals-list">
                        {#each goals as goal (goal._id)}
                                <li class="goal-card" class:completed={goal.completed} data-testid="goal-item">
                                        <label class="completed-toggle">
                                                <input
                                                        type="checkbox"
                                                        checked={goal.completed}
                                                        onchange={() => toggleCompleted(goal)}
                                                        aria-label="Mark {goal.title} as completed"
                                                />
                                                <span class="goal-title">{goal.title}</span>
                                        </label>

                                        {#if goal.category}
                                                <span class="badge">{goal.category}</span>
                                        {/if}

                                        {#if goal.target_value > 1}
                                                <div class="progress-bar" role="progressbar" aria-valuenow={goal.current_value} aria-valuemax={goal.target_value}>
                                                        <div
                                                                class="progress-fill"
                                                                style="width: {Math.min(100, (goal.current_value / goal.target_value) * 100)}%"
                                                        ></div>
                                                        <span class="progress-label">{goal.current_value}/{goal.target_value}</span>
                                                </div>
                                        {/if}

                                        <div class="card-actions">
                                                <button onclick={() => openEditModal(goal)} aria-label="Edit {goal.title}">Edit</button>
                                                <button onclick={() => requestDelete(goal)} aria-label="Delete {goal.title}">Delete</button>
                                        </div>
                                </li>
                        {/each}
                </ul>
        {/if}
</section>

<style>
        .goals-widget {
                display: flex;
                flex-direction: column;
                height: 100%;
                min-height: 0;
		overflow: hidden;
                background: var(--bg-glass, rgba(255, 255, 255, 0.6));
                backdrop-filter: var(--blur-glass);
                -webkit-backdrop-filter: var(--blur-glass);
                border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
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

        .btn-add {
                padding: 0.4rem 0.9rem;
                background: var(--accent-primary, #ff6b8b);
                color: #fff;
                border: none;
                border-radius: var(--radius-sm, 8px);
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
        }

        .goals-list {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding-right: 0.35rem;
        }

        .goal-card {
                background: var(--bg-surface, #f0eef8);
                border-radius: var(--radius-sm, 8px);
                padding: 0.875rem 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.4rem;
                transition: opacity 0.2s ease;
        }

        .goal-card.completed {
                opacity: 0.55;
        }

        .completed-toggle {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
        }

        .goal-title {
                font-weight: 600;
                color: var(--text-primary, #2d2d3a);
        }

        .goal-card.completed .goal-title {
                text-decoration: line-through;
        }

        .badge {
                display: inline-block;
                background: var(--accent-primary-soft, rgba(255, 107, 139, 0.15));
                color: var(--accent-primary, #ff6b8b);
                border-radius: 999px;
                padding: 0.1rem 0.6rem;
                font-size: 0.75rem;
                font-weight: 600;
                width: fit-content;
        }

        .progress-bar {
                position: relative;
                background: var(--bg-glass-border, rgba(255, 255, 255, 0.85));
                border-radius: 999px;
                height: 6px;
                overflow: hidden;
        }

        .progress-fill {
                height: 100%;
                background: var(--accent-primary, #ff6b8b);
                border-radius: 999px;
                transition: width 0.3s ease;
        }

        .progress-label {
                position: absolute;
                right: 0;
                top: -18px;
                font-size: 0.7rem;
                color: var(--text-muted, #a0a0c0);
        }

        .card-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 0.25rem;
        }

        .card-actions button {
                padding: 0.2rem 0.6rem;
                font-size: 0.75rem;
                border: 1px solid var(--input-border, rgba(0, 0, 0, 0.12));
                border-radius: var(--radius-sm, 8px);
                background: transparent;
                color: var(--text-secondary, #6b6b8a);
                cursor: pointer;
        }

        .state-msg {
                color: var(--text-muted, #a0a0c0);
                font-size: 0.9rem;
                text-align: center;
                padding: 1.5rem 0;
        }

        .state-msg.error {
                color: #e53e3e;
        }
</style>

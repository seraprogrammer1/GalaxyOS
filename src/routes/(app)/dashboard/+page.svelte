<script lang="ts">
	import Goals from '$lib/components/features/Goals.svelte';
	import BudgetWidget from '$lib/components/features/BudgetWidget.svelte';
	import NacaWidget from '$lib/components/features/NacaWidget.svelte';
	import RecentChatsWidget from '$lib/components/features/RecentChatsWidget.svelte';
	import { uiStore } from '$lib/stores/ui';
</script>

<section
	class="dashboard-root"
	class:layout-bento={$uiStore.dashboardLayout === 'bento'}
	class:layout-sidebar={$uiStore.dashboardLayout === 'sidebar'}
	class:layout-columns={$uiStore.dashboardLayout === 'columns'}
	data-layout={$uiStore.dashboardLayout}
	data-testid="dashboard-root"
>
	{#if $uiStore.dashboardLayout === 'sidebar'}
		<div class="sidebar-layout">
			<aside class="summary-column">
				<div class="widget-panel compact"><BudgetWidget variant={$uiStore.budgetVariant} /></div>
				<div class="widget-panel compact"><NacaWidget /></div>
			</aside>
			<div class="content-column">
				<div class="widget-panel tall"><Goals /></div>
				<div class="widget-panel short"><RecentChatsWidget /></div>
			</div>
		</div>
	{:else if $uiStore.dashboardLayout === 'columns'}
		<div class="columns-layout">
			<div class="widget-panel"><Goals /></div>
			<div class="widget-panel"><RecentChatsWidget /></div>
			<div class="widget-panel"><BudgetWidget variant={$uiStore.budgetVariant} /></div>
			<div class="widget-panel"><NacaWidget /></div>
		</div>
	{:else}
		<div class="bento-layout">
			<div class="widget-panel goals-cell"><Goals /></div>
			<div class="widget-panel chats-cell"><RecentChatsWidget /></div>
			<div class="widget-panel budget-cell"><BudgetWidget variant={$uiStore.budgetVariant} /></div>
			<div class="widget-panel naca-cell"><NacaWidget /></div>
		</div>
	{/if}
</section>

<style>
	.dashboard-root {
		height: 100%;
		min-height: 0;
	}

	.widget-panel {
		height: 100%;
		min-height: 0;
		display: flex;
	}

	.widget-panel > :global(section) {
		width: 100%;
		height: 100%;
	}

	.sidebar-layout {
		height: 100%;
		min-height: 0;
		display: flex;
		gap: 1rem;
	}

	.summary-column {
		width: 16rem;
		min-width: 16rem;
		display: grid;
		grid-template-rows: 1fr 1fr;
		gap: 1rem;
	}

	.content-column {
		flex: 1;
		min-width: 0;
		display: grid;
		grid-template-rows: 2fr 1fr;
		gap: 1rem;
	}

	.columns-layout {
		height: 100%;
		min-height: 0;
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 1rem;
	}

	@media (min-width: 900px) {
		.columns-layout {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.bento-layout {
		height: 100%;
		min-height: 0;
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		grid-template-rows: repeat(6, minmax(0, 1fr));
		gap: 1rem;
	}

	.goals-cell {
		grid-column: span 4;
		grid-row: span 6;
	}

	.chats-cell {
		grid-column: span 5;
		grid-row: span 4;
	}

	.budget-cell {
		grid-column: span 3;
		grid-row: span 3;
	}

	.naca-cell {
		grid-column: span 3;
		grid-row: span 3;
	}

	@media (max-width: 1023px) {
		.sidebar-layout {
			flex-direction: column;
		}

		.summary-column {
			width: 100%;
			min-width: 0;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			grid-template-rows: none;
		}

		.content-column {
			grid-template-rows: 1fr 1fr;
		}

		.bento-layout {
			grid-template-columns: repeat(1, minmax(0, 1fr));
			grid-template-rows: none;
		}

		.goals-cell,
		.chats-cell,
		.budget-cell,
		.naca-cell {
			grid-column: auto;
			grid-row: auto;
		}
	}
</style>

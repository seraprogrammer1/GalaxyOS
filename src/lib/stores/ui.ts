import { writable } from 'svelte/store';

export type DashboardLayout = 'bento' | 'sidebar' | 'columns';
export type BudgetVariant = 'standard' | 'minimal';

interface UiState {
	dashboardLayout: DashboardLayout;
	budgetVariant: BudgetVariant;
	initialized: boolean;
}

const DEFAULT_STATE: UiState = {
	dashboardLayout: 'bento',
	budgetVariant: 'standard',
	initialized: false
};

const STORAGE_KEY = 'galaxyos-ui-settings';

function createUiStore() {
	const { subscribe, update, set } = writable<UiState>(DEFAULT_STATE);
	let hasInitialized = false;

	async function init() {
		if (
			hasInitialized ||
			typeof window === 'undefined' ||
			(typeof process !== 'undefined' && Boolean(process.env.VITEST))
		)
			return;
		hasInitialized = true;

		try {
			const cached = window.localStorage.getItem(STORAGE_KEY);
			if (cached) {
				const parsed = JSON.parse(cached) as Partial<{
					dashboardLayout: DashboardLayout;
					budgetVariant: BudgetVariant;
				}>;
				update((state) => ({
					...state,
					dashboardLayout:
						parsed.dashboardLayout && ['bento', 'sidebar', 'columns'].includes(parsed.dashboardLayout)
							? parsed.dashboardLayout
							: state.dashboardLayout,
					budgetVariant:
						parsed.budgetVariant && ['standard', 'minimal'].includes(parsed.budgetVariant)
							? parsed.budgetVariant
							: state.budgetVariant
				}));
			}
		} catch {
			// Non-critical: corrupted cache falls back to API/defaults.
		}

		try {
			const res = await fetch('/api/settings');
			if (!res.ok) throw new Error('Failed to load UI settings');
			const data = (await res.json()) as Partial<{
				dashboard_layout: DashboardLayout;
				budget_variant: BudgetVariant;
			}>;

			update((state) => ({
				...state,
				dashboardLayout:
					data.dashboard_layout && ['bento', 'sidebar', 'columns'].includes(data.dashboard_layout)
						? data.dashboard_layout
						: state.dashboardLayout,
				budgetVariant:
					data.budget_variant && ['standard', 'minimal'].includes(data.budget_variant)
						? data.budget_variant
						: state.budgetVariant,
				initialized: true
			}));

			window.localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					dashboardLayout:
						data.dashboard_layout && ['bento', 'sidebar', 'columns'].includes(data.dashboard_layout)
							? data.dashboard_layout
							: DEFAULT_STATE.dashboardLayout,
					budgetVariant:
						data.budget_variant && ['standard', 'minimal'].includes(data.budget_variant)
							? data.budget_variant
							: DEFAULT_STATE.budgetVariant
				})
			);
		} catch {
			update((state) => ({ ...state, initialized: true }));
		}
	}

	function updateSettings(partial: Partial<Pick<UiState, 'dashboardLayout' | 'budgetVariant'>>) {
		let nextState: UiState = DEFAULT_STATE;
		update((state) => {
			nextState = {
				...state,
				dashboardLayout: partial.dashboardLayout ?? state.dashboardLayout,
				budgetVariant: partial.budgetVariant ?? state.budgetVariant
			};
			return nextState;
		});

		if (typeof window !== 'undefined') {
			window.localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					dashboardLayout: nextState.dashboardLayout,
					budgetVariant: nextState.budgetVariant
				})
			);
		}

		if (typeof window !== 'undefined') {
			const body: Record<string, string> = {};
			if (partial.dashboardLayout) body.dashboard_layout = partial.dashboardLayout;
			if (partial.budgetVariant) body.budget_variant = partial.budgetVariant;

			if (Object.keys(body).length > 0) {
				fetch('/api/settings', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				}).catch(() => undefined);
			}
		}
	}

	return {
		subscribe,
		set,
		init,
		setDashboardLayout: (layout: DashboardLayout) => updateSettings({ dashboardLayout: layout }),
		setBudgetVariant: (variant: BudgetVariant) => updateSettings({ budgetVariant: variant })
	};
}

export const uiStore = createUiStore();

if (typeof window !== 'undefined' && !(typeof process !== 'undefined' && Boolean(process.env.VITEST))) {
	uiStore.init();
}

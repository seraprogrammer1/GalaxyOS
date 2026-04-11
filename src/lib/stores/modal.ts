import { writable } from 'svelte/store';

export interface ModalState {
	component: never;
	props: Record<string, unknown>;
}

function createModalStore() {
	const { subscribe, set } = writable<ModalState | null>(null);

	return {
		subscribe,
		open: (component: never, props: Record<string, unknown> = {}) => {
			set({ component, props });
		},
		close: () => set(null)
	};
}

export const modalStore = createModalStore();

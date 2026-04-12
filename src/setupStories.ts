/**
 * Vitest setup file that configures Storybook portable stories.
 *
 * We import the preview config but skip MSW's browser-only `initialize()`
 * by providing our own project annotations without the mswLoader.
 */
import { setProjectAnnotations } from '@storybook/svelte';
import type { Preview } from '@storybook/svelte';

// Re-create the preview annotations without MSW's browser-only initializer.
// The individual story msw handlers are still declared in parameters.msw —
// they just won't run in unit tests (which is fine: we test the rendered UI,
// not the network layer).
const previewAnnotations: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		layout: 'padded'
	}
};

setProjectAnnotations([previewAnnotations]);

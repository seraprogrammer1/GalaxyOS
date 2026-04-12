/**
 * Storybook global preview configuration.
 *
 * - Boots MSW browser worker so every story can intercept fetch calls offline.
 * - Imports the app's global CSS to apply the "Light Cosmic" design tokens.
 */
import type { Preview } from '@storybook/svelte';
import { initialize, mswLoader } from 'msw-storybook-addon';
import '../src/app.css';

// Start the MSW service worker.  "bypass" means any request not matched by a
// story handler will fall through to the real network silently.
initialize({ onUnhandledRequest: 'bypass' });

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		layout: 'padded'
	},
	loaders: [mswLoader]
};

export default preview;

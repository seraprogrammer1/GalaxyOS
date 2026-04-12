/**
 * MSW browser worker — used by Storybook and the dev server for offline
 * component development.
 *
 * Start the worker in browser entry points:
 *   import { worker } from './mocks/browser';
 *   if (dev) await worker.start({ onUnhandledRequest: 'bypass' });
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

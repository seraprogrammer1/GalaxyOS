/**
 * MSW Node server — used by Vitest for server-side / SSR test intercepts.
 *
 * Import this in test files:
 *   import { server } from '$lib/../mocks/server'; // or relative path
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

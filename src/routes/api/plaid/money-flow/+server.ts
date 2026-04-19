import type { RequestHandler } from '@sveltejs/kit';
import { proxyToPlaid } from '$lib/server/plaidProxy';

export const GET: RequestHandler = async (event) => {
	return proxyToPlaid(event, 'money-flow', 'GET');
};

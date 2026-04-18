import type { RequestHandler } from '@sveltejs/kit';
import { proxyToPlaid } from '$lib/server/plaidProxy';

export const POST: RequestHandler = async (event) => {
	return proxyToPlaid(event, 'transactions/refresh', 'POST');
};

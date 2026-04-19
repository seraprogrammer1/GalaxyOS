import type { RequestHandler } from '@sveltejs/kit';
import { proxyToPlaid } from '$lib/server/plaidProxy';

export const DELETE: RequestHandler = async (event) => {
	return proxyToPlaid(event, 'clear', 'DELETE');
};

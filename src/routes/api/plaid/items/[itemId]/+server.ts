import type { RequestHandler } from '@sveltejs/kit';
import { proxyToPlaid } from '$lib/server/plaidProxy';

export const DELETE: RequestHandler = async (event) => {
	const { itemId } = event.params;
	return proxyToPlaid(event, `items/${itemId}`, 'DELETE');
};

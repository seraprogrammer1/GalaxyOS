import type { RequestHandler } from '@sveltejs/kit';
import { proxyToPlaid } from '$lib/server/plaidProxy';

export const POST: RequestHandler = async (event) => {
	const body = await event.request.json().catch(() => ({}));
	return proxyToPlaid(event, 'sandbox/fire-webhook', 'POST', body);
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { proxyToPlaid } from '$lib/server/plaidProxy';

export const POST: RequestHandler = async (event) => {
	const body = await event.request.json().catch(() => ({})) as Record<string, unknown>;
	if (!body.public_token || typeof body.public_token !== 'string') {
		return json({ error: 'public_token is required' }, { status: 400 });
	}
	return proxyToPlaid(event, 'exchange-token', 'POST', body);
};

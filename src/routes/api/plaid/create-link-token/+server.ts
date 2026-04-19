import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getPlaidClient } from '$lib/server/plaidClient';
import { CountryCode, Products } from 'plaid';

const VALID_PRODUCTS: string[] = ['transactions', 'investments', 'liabilities', 'recurring_transactions'];

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const body = await request.json().catch(() => ({})) as Record<string, unknown>;
	const products = Array.isArray(body.products)
		? (body.products as string[]).filter((p) => VALID_PRODUCTS.includes(p))
		: ['transactions'];
	const webhookUrl = typeof body.webhook_url === 'string' ? body.webhook_url : undefined;

	const client = getPlaidClient();
	const res = await client.linkTokenCreate({
		user: { client_user_id: locals.session.user_id ?? 'admin' },
		client_name: 'GalaxyOS',
		products: products as Products[],
		country_codes: [CountryCode.Us],
		language: 'en',
		...(webhookUrl ? { webhook: webhookUrl } : {})
	});

	return json({ link_token: res.data.link_token });
};

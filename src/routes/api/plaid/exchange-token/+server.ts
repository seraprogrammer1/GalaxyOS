import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getPlaidClient } from '$lib/server/plaidClient';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import { encrypt } from '$lib/server/encryption';
import { fullSync } from '$lib/server/plaidSync';
import mongoose from 'mongoose';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const body = await request.json().catch(() => ({})) as Record<string, unknown>;
	if (!body.public_token || typeof body.public_token !== 'string') {
		return json({ error: 'public_token is required' }, { status: 400 });
	}

	const client = getPlaidClient();
	const exchangeRes = await client.itemPublicTokenExchange({ public_token: body.public_token });
	const { access_token, item_id } = exchangeRes.data;

	// Fetch institution metadata
	const itemRes = await client.itemGet({ access_token });
	const institutionId = itemRes.data.item.institution_id ?? '';
	let institutionName = institutionId;
	if (institutionId) {
		try {
			const instRes = await client.institutionsGetById({
				institution_id: institutionId,
				country_codes: ['US' as import('plaid').CountryCode]
			});
			institutionName = instRes.data.institution.name;
		} catch { /* use ID as fallback name */ }
	}

	const products = Array.isArray(body.products)
		? (body.products as string[])
		: (itemRes.data.item.products ?? ['transactions']);

	const encryptedToken = encrypt(access_token);
	const owner = new mongoose.Types.ObjectId(locals.session.user_id);

	// Upsert — handles re-link scenario
	const existing = await PlaidItem.findOneAndUpdate(
		{ item_id },
		{ $set: { access_token: encryptedToken, institution_name: institutionName, institution_id: institutionId, products, owner } },
		{ new: true, upsert: true }
	);

	const status = existing ? 'updated' : 'success';

	// Fire-and-forget background sync
	fullSync(existing).catch((e) => console.error('[exchange-token] fullSync error:', e));

	return json({ status, item_id });
};

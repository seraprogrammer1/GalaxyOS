import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getPlaidClient } from '$lib/server/plaidClient';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import { decrypt } from '$lib/server/encryption';
import mongoose from 'mongoose';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const body = await request.json().catch(() => ({})) as Record<string, unknown>;
	const webhookType = typeof body.webhook_type === 'string' ? body.webhook_type : 'TRANSACTIONS';
	const webhookCode = typeof body.webhook_code === 'string' ? body.webhook_code : 'SYNC_UPDATES_AVAILABLE';

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const item = await PlaidItem.findOne({ owner });
	if (!item) return json({ error: 'No linked institution found' }, { status: 404 });

	const client = getPlaidClient();
	await client.sandboxItemFireWebhook({
		access_token: decrypt(item.access_token),
		webhook_type: webhookType,
		webhook_code: webhookCode as import('plaid').SandboxItemFireWebhookRequestWebhookCodeEnum
	});

	return json({ status: 'webhook fired', webhook_type: webhookType, webhook_code: webhookCode });
};

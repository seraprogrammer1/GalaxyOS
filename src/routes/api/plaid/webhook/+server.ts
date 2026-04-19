/**
 * POST /api/plaid/webhook
 *
 * Public endpoint — Plaid calls this from the internet to deliver event notifications.
 * Optionally verifies the JWT signature using Plaid's published JWK set.
 * Set PLAID_WEBHOOK_VERIFICATION=true in env to enable signature checking.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import crypto from 'node:crypto';
import * as jose from 'jose';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import {
	syncTransactions,
	syncInvestments,
	syncLiabilities,
	syncRecurring
} from '$lib/server/plaidSync';
import { env } from '$env/dynamic/private';

// Cache JWKs by kid to avoid repeated fetches
const jwkCache = new Map<string, CryptoKey>();

async function getJwk(kid: string): Promise<CryptoKey> {
	if (jwkCache.has(kid)) return jwkCache.get(kid)!;

	const plaidEnv = env.PLAID_ENV === 'production' ? 'production' : 'sandbox';
	const jwksUrl = `https://${plaidEnv}.plaid.com/openid/jwks.json`;
	const res = await fetch(jwksUrl);
	const jwks = (await res.json()) as { keys: jose.JWK[] };

	for (const key of jwks.keys) {
		if (key.kid) {
			const imported = await jose.importJWK(key) as CryptoKey;
			jwkCache.set(key.kid, imported);
		}
	}

	if (!jwkCache.has(kid)) throw new Error(`JWK with kid=${kid} not found`);
	return jwkCache.get(kid)!;
}

async function verifyPlaidWebhook(rawBody: string, jwtToken: string): Promise<void> {
	const decoded = jose.decodeProtectedHeader(jwtToken);
	if (!decoded.kid) throw new Error('JWT missing kid header');

	const key = await getJwk(decoded.kid);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { payload } = await jose.jwtVerify(jwtToken, key as any, { algorithms: ['ES256'] });

	const claims = payload as Record<string, unknown>;
	const expectedHash = claims['request_body_sha256'] as string;
	if (!expectedHash) throw new Error('JWT missing request_body_sha256 claim');

	const actualHash = crypto.createHash('sha256').update(rawBody).digest('hex');
	if (actualHash !== expectedHash) throw new Error('Body hash mismatch');
}

export const POST: RequestHandler = async ({ request }) => {
	const rawBody = await request.text();
	const jwtToken = request.headers.get('plaid-verification');

	// Verify signature if enabled
	if (env.PLAID_WEBHOOK_VERIFICATION === 'true') {
		if (!jwtToken) {
			return json({ error: 'Missing Plaid-Verification header' }, { status: 400 });
		}
		try {
			await verifyPlaidWebhook(rawBody, jwtToken);
		} catch (e) {
			console.error('[webhook] Signature verification failed:', e);
			return json({ error: 'Invalid webhook signature' }, { status: 401 });
		}
	}

	let event: Record<string, unknown>;
	try {
		event = JSON.parse(rawBody) as Record<string, unknown>;
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const webhookType = event.webhook_type as string;
	const webhookCode = event.webhook_code as string;
	const itemId = event.item_id as string;

	// Look up the PlaidItem to get the owner
	const item = itemId ? await PlaidItem.findOne({ item_id: itemId }) : null;

	if (item) {
		// Dispatch sync tasks in the background based on event type
		if (webhookType === 'TRANSACTIONS') {
			if (['SYNC_UPDATES_AVAILABLE', 'DEFAULT_UPDATE', 'INITIAL_UPDATE'].includes(webhookCode)) {
				syncTransactions(item).catch((e) => console.error('[webhook] syncTransactions error:', e));
			} else if (webhookCode === 'RECURRING_TRANSACTIONS_UPDATE') {
				syncRecurring(item).catch((e) => console.error('[webhook] syncRecurring error:', e));
			}
		} else if (webhookType === 'HOLDINGS') {
			syncInvestments(item).catch((e) => console.error('[webhook] syncInvestments error:', e));
		} else if (webhookType === 'LIABILITIES') {
			syncLiabilities(item).catch((e) => console.error('[webhook] syncLiabilities error:', e));
		}
	}

	return json({ status: 'received', webhook_type: webhookType, webhook_code: webhookCode });
};

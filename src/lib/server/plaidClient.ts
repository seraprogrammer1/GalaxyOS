/**
 * Singleton Plaid API client.
 * Reads PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV from SvelteKit private env.
 * PLAID_ENV accepts: 'sandbox' | 'production' (defaults to 'sandbox')
 */

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { env } from '$env/dynamic/private';

let _client: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi {
	if (_client) return _client;

	const plaidEnv = env.PLAID_ENV === 'production'
		? PlaidEnvironments.production
		: PlaidEnvironments.sandbox;

	const config = new Configuration({
		basePath: plaidEnv,
		baseOptions: {
			headers: {
				'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID ?? '',
				'PLAID-SECRET': env.PLAID_SECRET ?? ''
			}
		}
	});

	_client = new PlaidApi(config);
	return _client;
}

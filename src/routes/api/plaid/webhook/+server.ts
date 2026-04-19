/**
 * POST /api/plaid/webhook
 *
 * Public endpoint — Plaid calls this from the internet to deliver event
 * notifications. We just forward the raw body to the Python service which
 * handles cursor invalidation.  No session auth required.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

const PYTHON_BASE = (process.env.PYTHON_AI_SERVICE_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '');

export const POST: RequestHandler = async ({ request }) => {
	const rawBody = await request.text();
	const contentType = request.headers.get('content-type') ?? 'application/json';
	const plaidVerification = request.headers.get('plaid-verification');

	try {
		const headers: Record<string, string> = { 'Content-Type': contentType };
		if (plaidVerification) headers['Plaid-Verification'] = plaidVerification;
		const res = await fetch(`${PYTHON_BASE}/api/plaid/webhook`, {
			method: 'POST',
			headers,
			body: rawBody
		});
		const data = await res.json().catch(() => ({}));
		return json(data, { status: res.status });
	} catch {
		return json({ error: 'Python service unreachable' }, { status: 503 });
	}
};

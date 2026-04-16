/**
 * POST /api/plaid/webhook
 *
 * Public endpoint — Plaid calls this from the internet to deliver event
 * notifications. We just forward the raw body to the Python service which
 * handles cursor invalidation.  No session auth required.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

const PYTHON_BASE = 'http://127.0.0.1:8000';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	try {
		const res = await fetch(`${PYTHON_BASE}/api/plaid/webhook`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		const data = await res.json().catch(() => ({}));
		return json(data, { status: res.status });
	} catch {
		return json({ error: 'Python service unreachable' }, { status: 503 });
	}
};

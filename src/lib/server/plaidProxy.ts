import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

const PYTHON_BASE = 'http://127.0.0.1:8000';

/**
 * Forward a request to the Python Plaid service.
 * Adds X-Session-Token header so Python can independently validate auth.
 * First gate: caller must be 'admin' — if not, returns 403 before forwarding.
 */
export async function proxyToPlaid(
	event: RequestEvent,
	path: string,
	method: 'GET' | 'POST' | 'DELETE',
	body?: unknown
): Promise<Response> {
	if (!event.locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	if (event.locals.session.role !== 'admin') {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	const url = `${PYTHON_BASE}/api/plaid/${path}`;
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'X-Session-Token': event.locals.session.token,
	};

	let pythonRes: Response;
	try {
		pythonRes = await fetch(url, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
	} catch {
		return json(
			{ error: 'Python service unreachable — ensure the service is running.' },
			{ status: 503 }
		);
	}

	const data = await pythonRes.json().catch(() => ({}));
	return json(data, { status: pythonRes.status });
}

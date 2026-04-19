import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => ({})) as Record<string, unknown>;

	if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
		return json({ error: 'description is required', stage: 'input' }, { status: 400 });
	}

	let pythonRes: Response;
	try {
		pythonRes = await fetch('http://127.0.0.1:8000/api/characters/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				description: body.description,
				generate_lorebook: body.generate_lorebook === true,
				chub_model: typeof body.chub_model === 'string' ? body.chub_model : 'mythomax',
				gemini_model: typeof body.gemini_model === 'string' ? body.gemini_model : 'gemini-2.5-flash'
			})
		});
	} catch {
		return json(
			{ error: 'AI service unreachable — ensure the Python service is running.', stage: 'network' },
			{ status: 503 }
		);
	}

	const data = await pythonRes.json().catch(() => ({}));

	if (!pythonRes.ok) {
		return json(data, { status: pythonRes.status });
	}

	return json(data);
};

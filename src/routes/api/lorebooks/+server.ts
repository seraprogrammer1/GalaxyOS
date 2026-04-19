import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Lorebook } from '$lib/server/models/Lorebook';
import type { RequestHandler } from '@sveltejs/kit';

// ---------------------------------------------------------------------------
// GET /api/lorebooks
// ---------------------------------------------------------------------------
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const lorebooks = await Lorebook.find({ owner: locals.session.user_id }).sort({
		updated_at: -1
	});

	return json(lorebooks);
};

// ---------------------------------------------------------------------------
// POST /api/lorebooks
// ---------------------------------------------------------------------------
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

	if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
		return json({ error: 'title is required' }, { status: 400 });
	}

	await connectDB();

	const lorebook = await Lorebook.create({
		owner: locals.session.user_id,
		title: body.title.trim(),
		description: typeof body.description === 'string' ? body.description : '',
		entries: [],
		scan_depth: typeof body.scan_depth === 'number' ? body.scan_depth : 2,
		token_budget: typeof body.token_budget === 'number' ? body.token_budget : 2048,
		recursive_scanning: body.recursive_scanning === true
	});

	return json(lorebook, { status: 201 });
};

import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Lorebook } from '$lib/server/models/Lorebook';
import { Character } from '$lib/server/models/Character';
import { Chat } from '$lib/server/models/Chat';
import type { RequestHandler } from '@sveltejs/kit';

// ---------------------------------------------------------------------------
// GET /api/lorebooks/[id]
// ---------------------------------------------------------------------------
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const lorebook = await Lorebook.findOne({ _id: params.id });
	if (!lorebook) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (String(lorebook.owner) !== String(locals.session.user_id)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	return json(lorebook);
};

// ---------------------------------------------------------------------------
// PATCH /api/lorebooks/[id]
// ---------------------------------------------------------------------------
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const lorebook = await Lorebook.findOne({ _id: params.id });
	if (!lorebook) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (String(lorebook.owner) !== String(locals.session.user_id)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

	const update: Record<string, unknown> = {};
	if (typeof body.title === 'string' && body.title.trim()) update.title = body.title.trim();
	if (typeof body.description === 'string') update.description = body.description;
	if (typeof body.scan_depth === 'number') update.scan_depth = body.scan_depth;
	if (typeof body.token_budget === 'number') update.token_budget = body.token_budget;
	if (typeof body.recursive_scanning === 'boolean')
		update.recursive_scanning = body.recursive_scanning;
	if (Array.isArray(body.entries)) update.entries = body.entries;

	const updated = await Lorebook.findOneAndUpdate(
		{ _id: params.id },
		{ $set: update },
		{ returnDocument: 'after' }
	);

	return json(updated);
};

// ---------------------------------------------------------------------------
// DELETE /api/lorebooks/[id]
// ---------------------------------------------------------------------------
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const lorebook = await Lorebook.findOne({ _id: params.id });
	if (!lorebook) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (String(lorebook.owner) !== String(locals.session.user_id)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	await Lorebook.deleteOne({ _id: params.id });

	// Unlink from characters and chats
	await Character.updateMany(
		{ linked_lorebook_id: params.id },
		{ $set: { linked_lorebook_id: null } }
	);
	await Chat.updateMany({ lorebook_id: params.id }, { $set: { lorebook_id: null } });

	return new Response(null, { status: 204 });
};

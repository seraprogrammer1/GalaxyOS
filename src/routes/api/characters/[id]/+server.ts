import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Character } from '$lib/server/models/Character';
import { Chat } from '$lib/server/models/Chat';
import type { RequestHandler } from '@sveltejs/kit';

const ALLOWED_FIELDS = [
	'name', 'nickname', 'description', 'personality', 'scenario',
	'example_dialogue', 'first_message', 'alternate_greetings',
	'system_prompt', 'post_history_instructions', 'creator_notes',
	'tags', 'avatar_url', 'linked_lorebook_id', 'visible'
] as const;

// ---------------------------------------------------------------------------
// GET /api/characters/[id]
// ---------------------------------------------------------------------------
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const character = await Character.findOne({ _id: params.id });
	if (!character) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (String(character.owner) !== String(locals.session.user_id)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	return json(character);
};

// ---------------------------------------------------------------------------
// PATCH /api/characters/[id]
// ---------------------------------------------------------------------------
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const character = await Character.findOne({ _id: params.id });
	if (!character) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (String(character.owner) !== String(locals.session.user_id)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

	const update: Record<string, unknown> = {};
	for (const field of ALLOWED_FIELDS) {
		if (field in body) {
			update[field] = body[field];
		}
	}

	const updated = await Character.findOneAndUpdate(
		{ _id: params.id },
		{ $set: update },
		{ new: true }
	);

	return json(updated);
};

// ---------------------------------------------------------------------------
// DELETE /api/characters/[id]
// ---------------------------------------------------------------------------
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const character = await Character.findOne({ _id: params.id });
	if (!character) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (String(character.owner) !== String(locals.session.user_id)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	await Character.deleteOne({ _id: params.id });

	// Unlink from any chats that reference this character
	await Chat.updateMany(
		{ character_id: params.id },
		{ $set: { character_id: null } }
	);

	return new Response(null, { status: 204 });
};

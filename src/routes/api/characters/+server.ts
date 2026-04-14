import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Character } from '$lib/server/models/Character';
import type { RequestHandler } from '@sveltejs/kit';

// ---------------------------------------------------------------------------
// GET /api/characters
// ---------------------------------------------------------------------------
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const characters = await Character.find(
		{ owner: locals.session.user_id },
		{ name: 1, nickname: 1, description: 1, avatar_url: 1, tags: 1, source: 1, updated_at: 1 }
	).sort({ updated_at: -1 });

	return json(characters);
};

// ---------------------------------------------------------------------------
// POST /api/characters
// ---------------------------------------------------------------------------
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

	if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}

	await connectDB();

	const character = await Character.create({
		owner: locals.session.user_id,
		name: body.name.trim(),
		nickname: typeof body.nickname === 'string' ? body.nickname : '',
		description: typeof body.description === 'string' ? body.description : '',
		personality: typeof body.personality === 'string' ? body.personality : '',
		scenario: typeof body.scenario === 'string' ? body.scenario : '',
		example_dialogue: typeof body.example_dialogue === 'string' ? body.example_dialogue : '',
		first_message: typeof body.first_message === 'string' ? body.first_message : '',
		alternate_greetings: Array.isArray(body.alternate_greetings) ? body.alternate_greetings : [],
		system_prompt: typeof body.system_prompt === 'string' ? body.system_prompt : '',
		post_history_instructions:
			typeof body.post_history_instructions === 'string' ? body.post_history_instructions : '',
		creator_notes: typeof body.creator_notes === 'string' ? body.creator_notes : '',
		tags: Array.isArray(body.tags) ? body.tags : [],
		avatar_url: typeof body.avatar_url === 'string' ? body.avatar_url : '',
		linked_lorebook_id: body.linked_lorebook_id || null,
		source: typeof body.source === 'string' ? body.source : 'manual',
		source_id: typeof body.source_id === 'string' ? body.source_id : '',
		visible: body.visible !== false
	});

	return json(character, { status: 201 });
};

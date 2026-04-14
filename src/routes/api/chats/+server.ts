import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Chat } from '$lib/server/models/Chat';
import { Character } from '$lib/server/models/Character';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const chats = await Chat.find({ owner: locals.session.user_id });
	return json(chats);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

	await connectDB();

	const characterId =
		typeof body.character_id === 'string' && body.character_id ? body.character_id : null;

	// Resolve character (if provided) — verify ownership and extract greeting
	let characterName: string | null = null;
	let firstMessage: string | null = null;
	let linkedLorebookId: string | null = null;

	if (characterId) {
		const character = await Character.findOne({
			_id: characterId,
			owner: locals.session.user_id
		});
		if (character) {
			characterName = String(character.name);
			firstMessage =
				typeof character.first_message === 'string' && character.first_message.trim()
					? character.first_message.trim()
					: null;
			linkedLorebookId = character.linked_lorebook_id
				? String(character.linked_lorebook_id)
				: null;
		}
	}

	// Determine title: explicit > character name > default
	const title =
		typeof body.title === 'string' && body.title.trim()
			? body.title.trim()
			: characterName ?? 'New Chat';

	// Seed the messages array with the character greeting if present
	const messages = firstMessage
		? [{ role: 'assistant', content: firstMessage }]
		: [];

	const chat = await Chat.create({
		title,
		owner: locals.session.user_id,
		messages,
		character_id: characterId,
		lorebook_id: linkedLorebookId
	});

	return json(chat, { status: 201 });
};
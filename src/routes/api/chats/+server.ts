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
	let character: Awaited<ReturnType<typeof Character.findOne>> | null = null;

	if (characterId) {
		character = await Character.findOne({
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

	// Seed the messages array with the character greeting and all alternate_greetings as variants
	const allGreetings: string[] = [];
	if (firstMessage) {
		allGreetings.push(firstMessage);
		if (character) {
			const alts = Array.isArray(character.alternate_greetings)
				? (character.alternate_greetings as unknown[])
					.filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
				: [];
			allGreetings.push(...alts);
		}
	}
	const messages = allGreetings.length > 0
		? [{
				role: 'assistant',
				content: allGreetings[0],
				variants: allGreetings.map((g) => ({ content: g, tail: [] })),
				activeVariant: 0
		  }]
		: [];

	const chat = await Chat.create({
		title,
		owner: locals.session.user_id,
		messages,
		character_id: characterId,
		lorebook_id: linkedLorebookId,
		// Default to Chub when starting a chat with a character
		provider: characterId ? 'chub' : null
	});

	return json(chat, { status: 201 });
};
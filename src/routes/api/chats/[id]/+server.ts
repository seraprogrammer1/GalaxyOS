import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Chat } from '$lib/server/models/Chat';
import { Character } from '$lib/server/models/Character';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const chat = await Chat.findOne({ _id: params.id });
	if (!chat) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (String((chat as { owner: unknown }).owner) !== String(locals.session.user_id)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	return json(chat);
};

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const title = typeof body.title === 'string' ? body.title.trim() : null;
	const rawMessages = Array.isArray(body.messages) ? (body.messages as unknown[]) : null;
	const characterId = 'character_id' in body ? (body.character_id as string | null) : undefined;
	const lorebookId = 'lorebook_id' in body ? (body.lorebook_id as string | null) : undefined;
	const systemPrompt = typeof body.system_prompt === 'string' ? body.system_prompt : undefined;
	const postHistoryInstructions =
		typeof body.post_history_instructions === 'string'
			? body.post_history_instructions
			: undefined;
	const assistantPrefill =
		typeof body.assistant_prefill === 'string' ? body.assistant_prefill : undefined;
	const contextSize =
		body.context_size === null || typeof body.context_size === 'number'
			? body.context_size
			: undefined;

	const hasAnyField =
		title !== null ||
		rawMessages !== null ||
		characterId !== undefined ||
		lorebookId !== undefined ||
		systemPrompt !== undefined ||
		postHistoryInstructions !== undefined ||
		assistantPrefill !== undefined ||
		contextSize !== undefined;

	if (!hasAnyField) {
		return json({ error: 'No valid fields provided' }, { status: 400 });
	}

	if (rawMessages !== null) {
		const valid = rawMessages.every(
			(m) =>
				m !== null &&
				typeof m === 'object' &&
				['user', 'assistant', 'system'].includes(
					(m as Record<string, unknown>).role as string
				) &&
				typeof (m as Record<string, unknown>).content === 'string'
		);
		if (!valid) {
			return json({ error: 'Invalid messages array' }, { status: 400 });
		}
	}

	await connectDB();

	const chat = await Chat.findOne({ _id: params.id });
	if (!chat) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (String((chat as { owner: unknown }).owner) !== String(locals.session.user_id)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const c = chat as Record<string, unknown>;

	if (title !== null && title.length > 0) c.title = title;
	if (rawMessages !== null)
		c.messages = rawMessages.map((m) => ({
			role: (m as Record<string, unknown>).role,
			content: (m as Record<string, unknown>).content
		}));
	if (characterId !== undefined) c.character_id = characterId || null;

	// Seed greeting when assigning a character to an empty chat
	if (
		characterId &&
		rawMessages === null &&
		(c.messages as unknown[]).length === 0
	) {
		try {
			const charDoc = await Character.findById(characterId).lean() as Record<string, unknown> | null;
			if (charDoc && typeof charDoc.first_message === 'string' && charDoc.first_message.trim()) {
				c.messages = [{ role: 'assistant', content: charDoc.first_message.trim() }];
			}
		} catch { /* non-fatal */ }
	}
	if (lorebookId !== undefined) c.lorebook_id = lorebookId || null;
	if (systemPrompt !== undefined) c.system_prompt = systemPrompt;
	if (postHistoryInstructions !== undefined) c.post_history_instructions = postHistoryInstructions;
	if (assistantPrefill !== undefined) c.assistant_prefill = assistantPrefill;
	if (contextSize !== undefined) c.context_size = contextSize;

	await (chat as { save: () => Promise<unknown> }).save();

	return json(chat);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const chat = await Chat.findOne({ _id: params.id });
	if (!chat) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (String((chat as { owner: unknown }).owner) !== String(locals.session.user_id)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	await (chat as { deleteOne: () => Promise<unknown> }).deleteOne();

	return new Response(null, { status: 204 });
};

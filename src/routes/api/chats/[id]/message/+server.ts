import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Chat } from '$lib/server/models/Chat';
import {
	loadProviderConfig,
	loadCharacter,
	assembleMessages,
	callAI,
	type StoredMessage
} from '$lib/server/promptAssembler';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => ({})) as Record<string, unknown>;
	const content = typeof body.content === 'string' ? body.content.trim() : '';
	if (!content) return json({ error: 'content is required' }, { status: 400 });

	await connectDB();

	const chat = await Chat.findOne({ _id: params.id });
	if (!chat) return json({ error: 'Chat not found' }, { status: 404 });
	if (String((chat as { owner: unknown }).owner) !== String(locals.session.user_id))
		return json({ error: 'Forbidden' }, { status: 403 });

	const chatDoc = chat as {
		messages: StoredMessage[];
		character_id: unknown;
		lorebook_id: unknown;
		system_prompt: string;
		post_history_instructions: string;
		assistant_prefill: string;
		context_size: number | null;
		save: () => Promise<unknown>;
	};

	// Append user message
	chatDoc.messages.push({ role: 'user', content });
	await chatDoc.save();

	const [providerConfig, character] = await Promise.all([
		loadProviderConfig(locals.session.user_id),
		loadCharacter(chatDoc.character_id)
	]);

	const contextSize = chatDoc.context_size ?? 50;
	const historyWindow = chatDoc.messages
		.filter((m) => m.role !== 'system')
		.slice(-contextSize);

	let aiText: string;
	try {
		const assembled = await assembleMessages(historyWindow, chatDoc, character);
		aiText = await callAI(assembled, providerConfig);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'AI service error';
		return json({ error: msg }, { status: 502 });
	}

	// Prepend prefill into stored content so history is self-consistent
	const prefill = chatDoc.assistant_prefill.trim();
	const storedContent = prefill ? `${prefill}${aiText}` : aiText;

	chatDoc.messages.push({
		role: 'assistant',
		content: storedContent,
		variants: [{ content: storedContent, tail: [] }],
		activeVariant: 0
	} as StoredMessage & { variants: { content: string; tail: [] }[]; activeVariant: number });
	await chatDoc.save();

	return json(chat, { status: 200 });
};
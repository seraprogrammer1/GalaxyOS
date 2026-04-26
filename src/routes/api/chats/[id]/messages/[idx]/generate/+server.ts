/**
 * POST /api/chats/[id]/messages/[idx]/generate
 * Generate a new AI variant for the assistant message at `idx`.
 *
 * Algorithm:
 *  1. Save the current continuation (messages after idx) into the CURRENT variant's tail.
 *  2. Build context from messages[0..idx-1] (everything before this AI turn).
 *  3. Call the AI service.
 *  4. Push a new variant { content, tail: [] } onto msg.variants.
 *  5. Advance activeVariant to the new variant; clear the main array after idx.
 *  6. Save + return full chat (main array now ends at idx with new variant active).
 */

import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Chat } from '$lib/server/models/Chat';
import {
	loadProviderConfig,
	loadCharacter,
	assembleMessages,
	callAI,
	describeAIError,
	type StoredMessage
} from '$lib/server/promptAssembler';
import type { RequestHandler } from './$types';

interface Variant {
	content: string;
	tail: unknown[];
}

interface StoredMessageWithVariants extends StoredMessage {
	variants?: Variant[];
	activeVariant?: number;
}

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });

	const idx = parseInt(params.idx ?? '', 10);
	if (!Number.isFinite(idx) || idx < 0) return json({ error: 'Invalid message index' }, { status: 400 });

	await connectDB();

	const chat = await Chat.findOne({ _id: params.id });
	if (!chat) return json({ error: 'Not found' }, { status: 404 });
	if (String((chat as { owner: unknown }).owner) !== String(locals.session.user_id))
		return json({ error: 'Forbidden' }, { status: 403 });

	const chatDoc = chat as {
		messages: StoredMessageWithVariants[];
		character_id: unknown;
		lorebook_id: unknown;
		system_prompt: string;
		post_history_instructions: string;
		assistant_prefill: string;
		context_size: number | null;
		provider: string | null;
		save: () => Promise<unknown>;
		markModified: (path: string) => void;
	};

	const messages = chatDoc.messages;
	if (idx >= messages.length) return json({ error: 'Index out of range' }, { status: 400 });

	const msg = messages[idx];
	if (msg.role !== 'assistant') return json({ error: 'Only assistant messages can have variants generated' }, { status: 400 });

	// 1. Save current continuation into the CURRENT variant's tail
	const currentIdx = msg.activeVariant ?? 0;
	if (!msg.variants) msg.variants = [{ content: msg.content, tail: [] }];
	const currentTail = messages.splice(idx + 1) as StoredMessageWithVariants[];
	// Mutate in place — spreading a Mongoose subdoc loses its fields (prototype-only props)
	msg.variants[currentIdx].tail = currentTail as unknown[];

	// 2. Build context: everything BEFORE idx (the message being regenerated is excluded).
	//    messages[idx] is the assistant turn we're replacing — never send it to the AI.
	const contextSize = chatDoc.context_size ?? 50;
	const historyWindow = messages
		.slice(0, idx)
		.filter((m) => m.role !== 'system')
		.slice(-contextSize) as StoredMessage[];
	// Note: historyWindow may be empty for idx=0 (regenerating the first/greeting
	// message). _call_gemini handles the empty-contents + model-first cases itself.

	const [providerConfig, character] = await Promise.all([
		loadProviderConfig(locals.session.user_id, chatDoc.provider),
		loadCharacter(chatDoc.character_id, locals.session.user_id)
	]);

	let aiText: string;
	try {
		const assembled = await assembleMessages(historyWindow, chatDoc, character, locals.session.user_id);
		aiText = await callAI(assembled, providerConfig, chatDoc.assistant_prefill.trim() || undefined);
	} catch (e) {
		// Restore the tail on failure so the chat state stays consistent
		messages.push(...currentTail);
		msg.variants[currentIdx].tail = [];
		const detail = describeAIError(e);
		console.error('[chat variant] AI call failed', {
			provider: providerConfig.provider,
			model: providerConfig.provider === 'gemini' ? providerConfig.geminiModel : providerConfig.chubModel,
			...detail,
			stack: e instanceof Error ? e.stack : undefined
		});
		return json(
			{
				error: detail.message,
				provider: providerConfig.provider,
				statusCode: detail.statusCode,
				url: detail.url,
				responseBody: detail.responseBody,
				cause: detail.cause
			},
			{ status: 502 }
		);
	}

	const prefill = chatDoc.assistant_prefill.trim();
	const storedContent = prefill ? `${prefill}${aiText}` : aiText;

	// 3. Push the new variant with an empty tail (user is now at a fresh branch tip)
	msg.variants.push({ content: storedContent, tail: [] });
	const newVariantIdx = msg.variants.length - 1;

	// 4. Update the message to point at the new variant
	msg.activeVariant = newVariantIdx;
	msg.content = storedContent;

	// messages array after idx is now empty (new branch tip) — no push needed

	chatDoc.markModified('messages');
	await chatDoc.save();

	return json(chat);
};

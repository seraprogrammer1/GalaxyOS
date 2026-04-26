import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Chat } from '$lib/server/models/Chat';
import {
	loadProviderConfig,
	loadCharacter,
	assembleMessages,
	streamAI,
	describeAIError,
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
		provider: string | null;
		save: () => Promise<unknown>;
	};

	// Append user message
	chatDoc.messages.push({ role: 'user', content });
	await chatDoc.save();

	const [providerConfig, character] = await Promise.all([
		loadProviderConfig(locals.session.user_id, chatDoc.provider),
		loadCharacter(chatDoc.character_id, locals.session.user_id)
	]);

	const contextSize = chatDoc.context_size ?? 50;
	const historyWindow = chatDoc.messages
		.filter((m) => m.role !== 'system')
		.slice(-contextSize);

	let assembled: StoredMessage[];
	try {
		assembled = await assembleMessages(historyWindow, chatDoc, character, locals.session.user_id);
	} catch (e) {
		const detail = describeAIError(e);
		return json({ error: detail.message }, { status: 500 });
	}

	const prefill = chatDoc.assistant_prefill.trim();
	const { textStream } = streamAI(assembled, providerConfig, prefill || undefined);

	const responseStream = new ReadableStream({
		async start(controller) {
			const enc = new TextEncoder();
			const enqueue = (obj: unknown) =>
				controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

			let accumulated = '';
			try {
				const reader = textStream.getReader();
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					accumulated += value;
					enqueue({ c: value });
				}
			} catch (e) {
				const detail = describeAIError(e);
				console.error('[chat message] stream failed', {
					provider: providerConfig.provider,
					model: providerConfig.provider === 'gemini' ? providerConfig.geminiModel : providerConfig.chubModel,
					...detail
				});
				enqueue({ err: detail.message });
				controller.close();
				return;
			}

			// Persist assistant message (prepend prefill to keep history self-consistent)
			const storedContent = prefill ? `${prefill}${accumulated}` : accumulated;
			try {
				chatDoc.messages.push({
					role: 'assistant',
					content: storedContent,
					variants: [{ content: storedContent, tail: [] }],
					activeVariant: 0
				} as StoredMessage & { variants: { content: string; tail: [] }[]; activeVariant: number });
				await chatDoc.save();
			} catch (e) {
				console.error('[chat message] save failed', e);
			}

			enqueue({ done: true });
			controller.close();
		}
	});

	return new Response(responseStream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};

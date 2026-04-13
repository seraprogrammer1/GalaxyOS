import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Chat } from '$lib/server/models/Chat';
import { UserSettings } from '$lib/server/models/UserSettings';
import type { RequestHandler } from '@sveltejs/kit';

type PythonGenerateResponse =
	| string
	| {
			text?: string;
			message?: string;
			detail?: string;
	  };

export const POST: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => ({})) as Record<string, unknown>;
	const content = typeof body.content === 'string' ? body.content.trim() : '';

	if (!content) {
		return json({ error: 'content is required' }, { status: 400 });
	}

	await connectDB();

	const chat = await Chat.findOne({ _id: params.id });
	if (!chat) {
		return json({ error: 'Chat not found' }, { status: 404 });
	}

	if (String((chat as { owner: unknown }).owner) !== String(locals.session.user_id)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	// Fetch user's AI preferences (non-fatal — fall back to defaults)
	let provider = 'gemini';
	let geminiModel = 'gemini-2.5-flash';
	let chubModel = 'mythomax';
	try {
		const settings = await UserSettings.findOne({ user_id: locals.session.user_id });
		if (settings) {
			const s = settings as { default_provider?: string; gemini_model?: string; chub_model?: string };
			if (s.default_provider) provider = s.default_provider;
			if (s.gemini_model) geminiModel = s.gemini_model;
			if (s.chub_model) chubModel = s.chub_model;
		}
	} catch { /* use defaults */ }

	(chat as { messages: Array<{ role: string; content: string }> }).messages.push({
		role: 'user',
		content
	});
	await (chat as { save: () => Promise<unknown> }).save();

	const pythonResponse = await fetch('http://127.0.0.1:8000/api/generate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			messages: (chat as { messages: Array<{ role: string; content: string }> }).messages,
			provider,
			gemini_model: geminiModel,
			chub_model: chubModel
		})
	});

	if (!pythonResponse.ok) {
		const errBody = await pythonResponse.json().catch(() => ({ detail: 'AI service error' })) as { detail?: string };
		return json({ error: errBody.detail ?? 'Failed to generate assistant response' }, { status: 502 });
	}

	const generated = (await pythonResponse.json()) as PythonGenerateResponse;
	const assistantContent =
		typeof generated === 'string'
			? generated
			: typeof generated.text === 'string'
				? generated.text
				: typeof generated.message === 'string'
					? generated.message
					: '';

	if (!assistantContent) {
		return json({ error: 'Invalid AI response' }, { status: 502 });
	}

	(chat as { messages: Array<{ role: string; content: string }> }).messages.push({
		role: 'assistant',
		content: assistantContent
	});
	await (chat as { save: () => Promise<unknown> }).save();

	return json({ message: assistantContent }, { status: 200 });
};
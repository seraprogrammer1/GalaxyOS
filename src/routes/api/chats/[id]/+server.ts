import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Chat } from '$lib/server/models/Chat';
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

	if (title === null && rawMessages === null) {
		return json({ error: 'title or messages is required' }, { status: 400 });
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

	if (title !== null && title.length > 0) {
		(chat as { title: string }).title = title;
	}
	if (rawMessages !== null) {
		(chat as { messages: unknown[] }).messages = rawMessages.map((m) => ({
			role: (m as Record<string, unknown>).role,
			content: (m as Record<string, unknown>).content
		}));
	}
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

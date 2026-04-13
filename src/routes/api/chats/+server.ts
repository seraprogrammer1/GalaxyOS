import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Chat } from '$lib/server/models/Chat';
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

	const body = await request.json().catch(() => ({})) as Record<string, unknown>;

	await connectDB();

	const chat = await Chat.create({
		title: typeof body.title === 'string' && body.title.trim().length > 0 ? body.title.trim() : 'New Chat',
		owner: locals.session.user_id,
		messages: []
	});

	return json(chat, { status: 201 });
};
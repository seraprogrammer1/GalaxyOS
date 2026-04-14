/**
 * PATCH /api/chats/[id]/messages/[idx]
 * Switch the active variant of an assistant message.
 *
 * Body: { activeVariant: number }
 *
 * Algorithm (tail swap):
 *  1. Pull messages after idx out of the main array into the OLD variant's tail.
 *  2. Splice the NEW variant's saved tail back onto the main array.
 *  3. Clear the restored tail so it isn't double-stored.
 *  4. Update activeVariant + content, save, return full chat.
 */

import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Chat } from '$lib/server/models/Chat';
import type { RequestHandler } from './$types';

interface Variant {
	content: string;
	tail: unknown[];
}

interface StoredMessage {
	role: string;
	content: string;
	variants?: Variant[];
	activeVariant?: number;
}

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });

	const idx = parseInt(params.idx ?? '', 10);
	if (!Number.isFinite(idx) || idx < 0) return json({ error: 'Invalid message index' }, { status: 400 });

	const body = await request.json().catch(() => ({})) as Record<string, unknown>;
	const newIndex = typeof body.activeVariant === 'number' ? body.activeVariant : -1;
	if (newIndex < 0) return json({ error: 'activeVariant must be a non-negative number' }, { status: 400 });

	await connectDB();

	const chat = await Chat.findOne({ _id: params.id });
	if (!chat) return json({ error: 'Not found' }, { status: 404 });
	if (String((chat as { owner: unknown }).owner) !== String(locals.session.user_id))
		return json({ error: 'Forbidden' }, { status: 403 });

	const chatDoc = chat as { messages: StoredMessage[]; save: () => Promise<unknown> };
	const messages = chatDoc.messages;

	if (idx >= messages.length) return json({ error: 'Index out of range' }, { status: 400 });

	const msg = messages[idx];
	if (!msg.variants || msg.variants.length === 0)
		return json({ error: 'Message has no variants' }, { status: 400 });

	if (newIndex >= msg.variants.length)
		return json({ error: `Variant index ${newIndex} out of range (${msg.variants.length} variants)` }, { status: 400 });

	const oldIndex = msg.activeVariant ?? 0;
	if (oldIndex === newIndex) return json(chat); // no-op

	// 1. Save the current continuation (messages after idx) into the OLD variant's tail
	const currentTail = messages.splice(idx + 1) as StoredMessage[];
	msg.variants[oldIndex].tail = currentTail as unknown[];

	// 2. Restore the target variant's saved tail onto the main messages array
	const restoredTail = (msg.variants[newIndex].tail ?? []) as StoredMessage[];
	messages.push(...restoredTail);

	// 3. Clear the restored tail so it's not double-stored
	msg.variants[newIndex].tail = [];

	// 4. Update the branch pointer and authoritative content
	msg.activeVariant = newIndex;
	msg.content = msg.variants[newIndex].content;

	// Mongoose needs to know the array was mutated
	(chat as { markModified: (path: string) => void }).markModified('messages');
	await chatDoc.save();

	return json(chat);
};

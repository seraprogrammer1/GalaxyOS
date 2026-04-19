import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Chat } from '$lib/server/models/Chat';
import { Character } from '$lib/server/models/Character';
import { Lorebook } from '$lib/server/models/Lorebook';
import type { RequestHandler } from '@sveltejs/kit';

const VALID_ROLES = new Set(['user', 'assistant', 'system']);

function isTailMessage(v: unknown): v is { role: string; content: string } {
	return (
		typeof v === 'object' &&
		v !== null &&
		VALID_ROLES.has((v as Record<string, unknown>).role as string) &&
		typeof (v as Record<string, unknown>).content === 'string'
	);
}

function normalizeMessage(msg: unknown): Record<string, unknown> | null {
	if (typeof msg !== 'object' || msg === null) return null;
	const m = msg as Record<string, unknown>;
	if (!VALID_ROLES.has(m.role as string) || typeof m.content !== 'string') return null;

	const normalized: Record<string, unknown> = { role: m.role, content: m.content };

	if ('variants' in m) {
		if (!Array.isArray(m.variants)) return null;
		const variants = m.variants.map((variant) => {
			if (typeof variant !== 'object' || variant === null) return null;
			const v = variant as Record<string, unknown>;
			if (typeof v.content !== 'string' || !Array.isArray(v.tail) || !v.tail.every(isTailMessage)) {
				return null;
			}
			return {
				content: v.content,
				tail: v.tail.map((tailMessage) => {
					const t = tailMessage as Record<string, unknown>;
					return { role: t.role, content: t.content };
				})
			};
		});
		if (variants.some((variant) => variant === null)) return null;
		normalized.variants = variants;
	}

	if ('activeVariant' in m) {
		if (!Number.isInteger(m.activeVariant)) return null;
		if (!Array.isArray(normalized.variants)) return null;
		const activeVariant = m.activeVariant as number;
		if (activeVariant < 0 || activeVariant >= normalized.variants.length) return null;
		normalized.activeVariant = activeVariant;
	}

	return normalized;
}

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
	const hasCharacterId = 'character_id' in body;
	const hasLorebookId = 'lorebook_id' in body;
	const characterId =
		!hasCharacterId
			? undefined
			: body.character_id === null
				? null
				: typeof body.character_id === 'string'
					? body.character_id.trim()
					: undefined;
	const lorebookId =
		!hasLorebookId
			? undefined
			: body.lorebook_id === null
				? null
				: typeof body.lorebook_id === 'string'
					? body.lorebook_id.trim()
					: undefined;
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
	const provider =
		'provider' in body
			? (typeof body.provider === 'string' ? body.provider : null)
			: undefined;

	const hasAnyField =
		title !== null ||
		rawMessages !== null ||
		characterId !== undefined ||
		lorebookId !== undefined ||
		systemPrompt !== undefined ||
		postHistoryInstructions !== undefined ||
		assistantPrefill !== undefined ||
		contextSize !== undefined ||
		provider !== undefined;

	if (!hasAnyField) {
		return json({ error: 'No valid fields provided' }, { status: 400 });
	}

	if (hasCharacterId && characterId === undefined) {
		return json({ error: 'character_id must be a string or null' }, { status: 400 });
	}

	if (hasLorebookId && lorebookId === undefined) {
		return json({ error: 'lorebook_id must be a string or null' }, { status: 400 });
	}

	if (rawMessages !== null) {
		if (!rawMessages.every((m) => normalizeMessage(m) !== null)) {
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
		c.messages = rawMessages.map((m) => normalizeMessage(m)).filter((m) => m !== null);

	let assignedCharacterDoc: Record<string, unknown> | null = null;
	if (characterId !== undefined) {
		if (characterId) {
			assignedCharacterDoc = (await Character.findOne({
				_id: characterId,
				owner: locals.session.user_id
			}).lean()) as Record<string, unknown> | null;
			if (!assignedCharacterDoc) {
				return json({ error: 'Character not found' }, { status: 404 });
			}
		}
		c.character_id = characterId || null;
	}

	// Seed greeting when assigning a character to an empty chat
	if (
		characterId &&
		rawMessages === null &&
		(c.messages as unknown[]).length === 0
	) {
		try {
			const charDoc = assignedCharacterDoc;
			if (charDoc && typeof charDoc.first_message === 'string' && charDoc.first_message.trim()) {
				const firstMsg = charDoc.first_message.trim();
				const alts = Array.isArray(charDoc.alternate_greetings)
					? (charDoc.alternate_greetings as unknown[])
						.filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
					: [];
				const allGreetings = [firstMsg, ...alts];
				c.messages = [{
					role: 'assistant',
					content: firstMsg,
					variants: allGreetings.map((g) => ({ content: g, tail: [] })),
					activeVariant: 0
				}];
			}
		} catch { /* non-fatal */ }
		// Auto-default to Chub when assigning a character (if no explicit provider set)
		if (provider === undefined && !c.provider) c.provider = 'chub';
	}
	if (lorebookId !== undefined) {
		if (lorebookId) {
			const lorebook = await Lorebook.findOne({
				_id: lorebookId,
				owner: locals.session.user_id
			}).lean();
			if (!lorebook) {
				return json({ error: 'Lorebook not found' }, { status: 404 });
			}
		}
		c.lorebook_id = lorebookId || null;
	}
	if (systemPrompt !== undefined) c.system_prompt = systemPrompt;
	if (postHistoryInstructions !== undefined) c.post_history_instructions = postHistoryInstructions;
	if (assistantPrefill !== undefined) c.assistant_prefill = assistantPrefill;
	if (contextSize !== undefined) c.context_size = contextSize;
	if (provider !== undefined) c.provider = provider || null;

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

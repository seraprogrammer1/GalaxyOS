import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Chat } from '$lib/server/models/Chat';
import { Character } from '$lib/server/models/Character';
import { Lorebook } from '$lib/server/models/Lorebook';
import { UserSettings } from '$lib/server/models/UserSettings';
import { runLorebookEngine } from '$lib/server/lorebookEngine';
import { applyMacros } from '$lib/server/macroEngine';
import type { RequestHandler } from '@sveltejs/kit';

type PythonGenerateResponse =
	| string
	| {
			text?: string;
			message?: string;
			detail?: string;
	  };

interface StoredMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

/** Build the system prompt string from character + chat overrides. */
function buildSystemContent(
	char: Record<string, unknown> | null,
	chatSystemPrompt: string
): string {
	if (chatSystemPrompt.trim()) {
		return chatSystemPrompt.trim();
	}
	if (!char) return '';

	const parts: string[] = [];
	const charSP = typeof char.system_prompt === 'string' ? char.system_prompt.trim() : '';
	if (charSP) {
		parts.push(charSP);
	} else {
		if (typeof char.description === 'string' && char.description.trim())
			parts.push(`[Description]\n${char.description.trim()}`);
		if (typeof char.personality === 'string' && char.personality.trim())
			parts.push(`[Personality]\n${char.personality.trim()}`);
		if (typeof char.scenario === 'string' && char.scenario.trim())
			parts.push(`[Scenario]\n${char.scenario.trim()}`);
	}
	if (!charSP && typeof char.example_dialogue === 'string' && char.example_dialogue.trim())
		parts.push(`[Example Dialogue]\n${char.example_dialogue.trim()}`);

	return parts.join('\n\n');
}

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

	// ── Fetch user AI preferences ────────────────────────────────────────────
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

	// ── Typed chat doc ───────────────────────────────────────────────────────
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

	// ── Append user message ──────────────────────────────────────────────────
	chatDoc.messages.push({ role: 'user', content });
	await chatDoc.save();

	// ── Resolve character ────────────────────────────────────────────────────
	let character: Record<string, unknown> | null = null;
	if (chatDoc.character_id) {
		try {
			const charDoc = await Character.findById(chatDoc.character_id).lean();
			if (charDoc) character = charDoc as Record<string, unknown>;
		} catch { /* not found */ }
	}

	// ── Resolve lorebook entries ─────────────────────────────────────────────
	let lorebookEntries: string[] = [];
	if (chatDoc.lorebook_id) {
		try {
			const lb = await Lorebook.findById(chatDoc.lorebook_id).lean() as Record<string, unknown> | null;
			if (lb) {
				lorebookEntries = runLorebookEngine(
					{
						scan_depth:         (lb.scan_depth         as number)  ?? 2,
						token_budget:       (lb.token_budget       as number)  ?? 2048,
						recursive_scanning: (lb.recursive_scanning as boolean) ?? false,
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						entries: (lb.entries as any[]) ?? []
					},
					chatDoc.messages
				);
			}
		} catch { /* lorebook unavailable */ }
	}

	// ── Macro context ────────────────────────────────────────────────────────
	const macroCtx = {
		char:  (typeof character?.nickname === 'string' && character.nickname.trim())
		         ? character.nickname.trim()
		         : (typeof character?.name === 'string' ? character.name.trim() : undefined),
		user:             'User',
		personality:      typeof character?.personality      === 'string' ? character.personality      : undefined,
		scenario:         typeof character?.scenario         === 'string' ? character.scenario         : undefined,
		description:      typeof character?.description      === 'string' ? character.description      : undefined,
		example_dialogue: typeof character?.example_dialogue === 'string' ? character.example_dialogue : undefined,
	};

	// ── Assemble context for AI ──────────────────────────────────────────────
	const rawSystemContent = buildSystemContent(character, chatDoc.system_prompt);
	const systemContent = rawSystemContent ? applyMacros(rawSystemContent, macroCtx) : '';

	const contextSize = chatDoc.context_size ?? 50;
	const historyWindow = chatDoc.messages
		.filter((m) => m.role !== 'system')
		.slice(-contextSize);

	const assembled: StoredMessage[] = [];

	// 1. System prompt
	if (systemContent) assembled.push({ role: 'system', content: systemContent });

	// 2. Lorebook world-info block
	if (lorebookEntries.length > 0) {
		const worldInfo = lorebookEntries.map((e) => applyMacros(e, macroCtx)).join('\n\n');
		assembled.push({ role: 'system', content: `[World Info]\n${worldInfo}` });
	}

	// 3. History + optional post-history instructions (injected before last user message)
	const phi = chatDoc.post_history_instructions.trim();
	if (phi) {
		const phiContent = applyMacros(phi, macroCtx);
		let inserted = false;
		for (let i = historyWindow.length - 1; i >= 0; i--) {
			if (historyWindow[i].role === 'user') {
				assembled.push(...historyWindow.slice(0, i));
				assembled.push({ role: 'system', content: phiContent });
				assembled.push(...historyWindow.slice(i));
				inserted = true;
				break;
			}
		}
		if (!inserted) {
			assembled.push({ role: 'system', content: phiContent });
			assembled.push(...historyWindow);
		}
	} else {
		assembled.push(...historyWindow);
	}

	// 4. Assistant prefill
	const prefill = chatDoc.assistant_prefill.trim();
	if (prefill) assembled.push({ role: 'assistant', content: prefill });

	// ── Call Python AI service ───────────────────────────────────────────────
	const pythonResponse = await fetch('http://127.0.0.1:8000/api/generate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			messages: assembled,
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
	const aiText =
		typeof generated === 'string'
			? generated
			: typeof generated === 'object' && generated !== null
				? (typeof generated.text    === 'string' ? generated.text    :
				   typeof generated.message === 'string' ? generated.message : '')
				: '';

	if (!aiText) {
		return json({ error: 'Invalid AI response' }, { status: 502 });
	}

	// Prepend prefill into the stored assistant message so history is self-consistent
	const storedContent = prefill ? `${prefill}${aiText}` : aiText;

	chatDoc.messages.push({ role: 'assistant', content: storedContent });
	await chatDoc.save();

	return json({ message: storedContent }, { status: 200 });
};
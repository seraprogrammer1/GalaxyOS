/**
 * Shared prompt assembly logic used by both the main message endpoint
 * and the per-message generate-variant endpoint.
 */

import { Character } from '$lib/server/models/Character';
import { Lorebook } from '$lib/server/models/Lorebook';
import { UserSettings } from '$lib/server/models/UserSettings';
import { runLorebookEngine } from '$lib/server/lorebookEngine';
import { applyMacros } from '$lib/server/macroEngine';
import { callProvider } from '$lib/server/aiProviders';

export interface StoredMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

export interface ChatConfig {
	character_id: unknown;
	lorebook_id: unknown;
	system_prompt: string;
	post_history_instructions: string;
	assistant_prefill: string;
	context_size: number | null;
}

export interface ProviderConfig {
	provider: string;
	geminiModel: string;
	chubModel: string;
}

function buildSystemContent(char: Record<string, unknown> | null, chatSystemPrompt: string): string {
	if (chatSystemPrompt.trim()) return chatSystemPrompt.trim();
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

/**
 * Load AI provider settings from UserSettings.
 * Pass chatProvider to override the provider while still using the user's model preferences.
 */
export async function loadProviderConfig(
	userId: unknown,
	chatProvider?: string | null
): Promise<ProviderConfig> {
	let provider = 'gemini';
	let geminiModel = 'gemini-2.5-flash';
	let chubModel = 'mythomax';
	try {
		const settings = await UserSettings.findOne({ user_id: userId });
		if (settings) {
			const s = settings as { default_provider?: string; gemini_model?: string; chub_model?: string };
			if (s.default_provider) provider = s.default_provider;
			if (s.gemini_model) geminiModel = s.gemini_model;
			if (s.chub_model) chubModel = s.chub_model;
		}
	} catch { /* use defaults */ }
	// Per-chat override takes precedence over user settings (model names still from user settings)
	if (chatProvider) provider = chatProvider;
	return { provider, geminiModel, chubModel };
}

/** Load character document by ID for the owning user. Returns null if not found or on error. */
export async function loadCharacter(
	characterId: unknown,
	userId: unknown
): Promise<Record<string, unknown> | null> {
	if (!characterId) return null;
	try {
		const charDoc = await Character.findOne({ _id: characterId, owner: userId }).lean();
		return charDoc ? (charDoc as Record<string, unknown>) : null;
	} catch { return null; }
}

/**
 * Build the fully assembled messages array to send to the Python AI service.
 *
 * @param history       The slice of messages to use as context (non-system messages).
 * @param config        Chat-level config fields (system_prompt, etc.).
 * @param character     Resolved character document or null.
 * @param userId        User ID for lorebook lookup.
 */
export async function assembleMessages(
	history: StoredMessage[],
	config: ChatConfig,
	character: Record<string, unknown> | null,
	userId: unknown
): Promise<StoredMessage[]> {
	// Resolve lorebook entries
	let lorebookEntries: string[] = [];
	if (config.lorebook_id) {
		try {
			const lb = await Lorebook.findOne({
				_id: config.lorebook_id,
				owner: userId
			}).lean() as Record<string, unknown> | null;
			if (lb) {
				lorebookEntries = runLorebookEngine(
					{
						scan_depth: (lb.scan_depth as number) ?? 2,
						token_budget: (lb.token_budget as number) ?? 2048,
						recursive_scanning: (lb.recursive_scanning as boolean) ?? false,
						entries: (lb.entries as never[]) ?? []
					},
					history
				);
			}
		} catch { /* lorebook unavailable */ }
	}

	// Macro context
	const macroCtx = {
		char: (typeof character?.nickname === 'string' && character.nickname.trim())
			? character.nickname.trim()
			: (typeof character?.name === 'string' ? character.name.trim() : undefined),
		user: 'User',
		personality: typeof character?.personality === 'string' ? character.personality : undefined,
		scenario: typeof character?.scenario === 'string' ? character.scenario : undefined,
		description: typeof character?.description === 'string' ? character.description : undefined,
		example_dialogue: typeof character?.example_dialogue === 'string' ? character.example_dialogue : undefined,
	};

	const rawSystemContent = buildSystemContent(character, config.system_prompt);
	const systemContent = rawSystemContent ? applyMacros(rawSystemContent, macroCtx) : '';

	const assembled: StoredMessage[] = [];

	// 1. System prompt
	if (systemContent) assembled.push({ role: 'system', content: systemContent });

	// 2. Lorebook world-info block
	if (lorebookEntries.length > 0) {
		const worldInfo = lorebookEntries.map((e) => applyMacros(e, macroCtx)).join('\n\n');
		assembled.push({ role: 'system', content: `[World Info]\n${worldInfo}` });
	}

	// 3. History + optional post-history instructions
	const phi = config.post_history_instructions.trim();
	if (phi) {
		const phiContent = applyMacros(phi, macroCtx);
		let inserted = false;
		for (let i = history.length - 1; i >= 0; i--) {
			if (history[i].role === 'user') {
				assembled.push(...history.slice(0, i));
				assembled.push({ role: 'system', content: phiContent });
				assembled.push(...history.slice(i));
				inserted = true;
				break;
			}
		}
		if (!inserted) {
			assembled.push({ role: 'system', content: phiContent });
			assembled.push(...history);
		}
	} else {
		assembled.push(...history);
	}

	// 4. Assistant prefill
	const prefill = config.assistant_prefill.trim();
	if (prefill) assembled.push({ role: 'assistant', content: prefill });

	return assembled;
}

/** Call the configured AI provider and return the generated text. */
export async function callAI(
	assembled: StoredMessage[],
	providerConfig: ProviderConfig,
	prefill?: string
): Promise<string> {
	const text = await callProvider(
		assembled as import('$lib/server/aiProviders').AIMessage[],
		providerConfig.provider,
		providerConfig.geminiModel,
		providerConfig.chubModel,
		prefill
	);
	if (!text) throw new Error('Invalid AI response');
	return text;
}

/**
 * Extract structured detail from any AI-SDK / fetch error so the chat endpoints
 * can return actionable info (statusCode, url, upstream response body) instead
 * of a bare "Not Found" string.
 */
export function describeAIError(e: unknown): {
	message: string;
	statusCode?: number;
	url?: string;
	responseBody?: string;
	cause?: string;
} {
	if (!e || typeof e !== 'object') {
		return { message: typeof e === 'string' ? e : 'AI service error' };
	}
	const err = e as Record<string, unknown>;
	const out: {
		message: string;
		statusCode?: number;
		url?: string;
		responseBody?: string;
		cause?: string;
	} = {
		message: typeof err.message === 'string' ? err.message : 'AI service error'
	};
	if (typeof err.statusCode === 'number') out.statusCode = err.statusCode;
	if (typeof err.url === 'string') out.url = err.url;
	if (typeof err.responseBody === 'string' && err.responseBody.length > 0) {
		// Truncate very large bodies so we don't flood the client
		out.responseBody = err.responseBody.length > 2000
			? err.responseBody.slice(0, 2000) + '…[truncated]'
			: err.responseBody;
	}
	if (err.cause && typeof err.cause === 'object') {
		const c = err.cause as Record<string, unknown>;
		if (typeof c.message === 'string') out.cause = c.message;
	}
	return out;
}

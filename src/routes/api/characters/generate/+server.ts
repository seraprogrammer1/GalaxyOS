import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { callGemini, callChub } from '$lib/server/aiProviders';
import { PROMPT_SANITIZE, PROMPT_FILL, PROMPT_FILL_FALLBACK, PROMPT_LOREBOOK } from '$lib/server/prompts';

function parseJsonFromText(text: string): unknown {
	// Strip markdown fences if present
	const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
	return JSON.parse(cleaned);
}

function buildError(stage: string, provider: string, detail: string, upstreamStatus?: number) {
	return json({ stage, provider, upstream_status: upstreamStatus ?? null, detail }, { status: 502 });
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => ({})) as Record<string, unknown>;

	if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
		return json({ error: 'description is required', stage: 'input' }, { status: 400 });
	}

	const chubModel = typeof body.chub_model === 'string' ? body.chub_model : 'mythomax';
	const geminiModel = typeof body.gemini_model === 'string' ? body.gemini_model : 'gemini-2.5-flash';
	const generateLorebook = body.generate_lorebook === true;

	// ── Stage A: Sanitization (Chub) ──────────────────────────────────────────
	let sanitized: string;
	try {
		const messages = [
			{ role: 'system' as const, content: PROMPT_SANITIZE },
			{ role: 'user' as const, content: body.description.trim() }
		];
		let response = await callChub(messages, chubModel);

		// Tool-call loop: if Chub requests a Gemini lookup, fulfill it (up to 5 rounds)
		for (let round = 0; round < 5; round++) {
			const toolCallMatch = response.match(/\[call_gemini\]\s*([\s\S]+?)\[\/call_gemini\]/i);
			if (!toolCallMatch) break;
			const query = toolCallMatch[1].trim();
			const geminiLookup = await callGemini(
				[{ role: 'user', content: query }],
				geminiModel
			).catch(() => 'Unable to retrieve information.');
			messages.push({ role: 'assistant', content: response });
			messages.push({ role: 'user', content: `[call_gemini result]\n${geminiLookup}` });
			response = await callChub(messages, chubModel);
		}

		// Extract text up to END marker
		const endIdx = response.indexOf('\nEND');
		sanitized = endIdx !== -1 ? response.slice(0, endIdx).trim() : response.trim();
	} catch (e) {
		return buildError('sanitize', 'chub', e instanceof Error ? e.message : 'Sanitization failed');
	}

	// ── Stage B: Character Data Filling ───────────────────────────────────────
	let characterData: unknown;
	let filledBy = 'gemini';
	try {
		const fillMessages = [
			{ role: 'system' as const, content: PROMPT_FILL },
			{ role: 'user' as const, content: sanitized }
		];
		const raw = await callGemini(fillMessages, geminiModel);
		characterData = parseJsonFromText(raw);
	} catch {
		// Fallback to Chub if Gemini is unavailable or blocked
		filledBy = 'chub';
		try {
			const fallbackMessages = [
				{ role: 'system' as const, content: PROMPT_FILL_FALLBACK },
				{ role: 'user' as const, content: sanitized }
			];
			const raw = await callChub(fallbackMessages, chubModel);
			characterData = parseJsonFromText(raw);
		} catch (e2) {
			return buildError('fill', filledBy, e2 instanceof Error ? e2.message : 'Character filling failed');
		}
	}

	// ── Stage C: Lorebook Generation (optional, non-fatal) ────────────────────
	let lorebookData: unknown = null;
	let lorebookSkipped = !generateLorebook;

	if (generateLorebook) {
		try {
			const lbMessages = [
				{ role: 'system' as const, content: PROMPT_LOREBOOK },
				{ role: 'user' as const, content: sanitized }
			];
			const raw = await callGemini(lbMessages, geminiModel);
			lorebookData = parseJsonFromText(raw);
		} catch {
			lorebookSkipped = true;
		}
	}

	return json({
		character: characterData,
		lorebook: lorebookData,
		lorebook_skipped: lorebookSkipped,
		_filled_by: filledBy
	});
};


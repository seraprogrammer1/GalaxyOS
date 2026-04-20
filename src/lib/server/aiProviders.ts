/**
 * AI provider adapters.
 *
 * Supports:
 *  - Gemini via @ai-sdk/google (Vercel AI SDK)
 *  - Chub AI via raw fetch to the model-specific /chat/completions proxy.
 *    @ai-sdk/openai v3 routes through the Responses API (/responses), which
 *    Chub does not support, so we call the OpenAI-compatible endpoint directly.
 */

import { generateText, streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { env } from '$env/dynamic/private';

export interface AIMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

// ─── Chub: model → /chat/completions URL ──────────────────────────────────────

// Chub's mercury/mars proxies are model-specific in the URL path.
const CHUB_URLS: Record<string, string> = {
	mythomax: 'https://mercury.chub.ai/mythomax/v1/chat/completions',
	mixtral:  'https://mars.chub.ai/mixtral/v1/chat/completions',
	asha:     'https://mars.chub.ai/chub/asha/v1/chat/completions',
	gemma:    'https://mercury.chub.ai/gemma/v1/chat/completions'
};

function chubUrlFor(modelId: string): string {
	if (CHUB_URLS[modelId]) return CHUB_URLS[modelId];
	// Fall back to CHUB_BASE_URL with /chat/completions appended.
	const base = (env.CHUB_BASE_URL ?? 'https://mercury.chub.ai/mythomax/v1').replace(/\/$/, '');
	return `${base}/chat/completions`;
}

/**
 * OpenAI-compatible APIs reject consecutive same-role messages — merge them.
 */
function mergeConsecutive(messages: AIMessage[]): AIMessage[] {
	const out: AIMessage[] = [];
	for (const m of messages) {
		const last = out[out.length - 1];
		if (last && last.role === m.role) {
			last.content = `${last.content}\n\n${m.content}`;
		} else {
			out.push({ ...m });
		}
	}
	return out;
}

// ─── Gemini via AI SDK ────────────────────────────────────────────────────────

function getGeminiModel(modelId: string) {
	const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY ?? '' });
	return google(modelId);
}

export async function callGemini(
	messages: AIMessage[],
	modelId = 'gemini-2.5-flash'
): Promise<string> {
	const { text } = await generateText({
		model: getGeminiModel(modelId),
		messages
	});
	return text;
}

export function streamGemini(messages: AIMessage[], modelId = 'gemini-2.5-flash') {
	return streamText({
		model: getGeminiModel(modelId),
		messages
	});
}

// ─── Chub via raw fetch to /chat/completions ──────────────────────────────────

export async function callChub(
	messages: AIMessage[],
	modelId = 'mythomax',
	prefill?: string
): Promise<string> {
	const url = chubUrlFor(modelId);
	const apiKey = env.CHUB_API_KEY ?? '';
	if (!apiKey) throw new Error('CHUB_API_KEY not configured');

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: modelId,
			messages: mergeConsecutive(messages)
		})
	});

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		const err = new Error(`Chub ${res.status}: ${body || res.statusText}`) as Error & {
			statusCode: number;
			url: string;
			responseBody: string;
		};
		err.statusCode = res.status;
		err.url = url;
		err.responseBody = body;
		throw err;
	}

	const data = (await res.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	let content = data.choices?.[0]?.message?.content;
	if (typeof content !== 'string' || content.length === 0) {
		throw new Error(`Unexpected Chub response shape: ${JSON.stringify(data).slice(0, 500)}`);
	}
	// Chub sometimes echoes the assistant prefill at the start of its reply.
	// Strip it so callers can prepend it themselves without duplication.
	if (prefill && content.startsWith(prefill)) {
		content = content.slice(prefill.length);
	}
	return content;
}

/**
 * Streaming Chub call. Yields a ReadableStream of text chunks parsed from the
 * SSE response. Shaped like `streamText()` so callers can use `.textStream`.
 */
export function streamChub(messages: AIMessage[], modelId = 'mythomax') {
	const url = chubUrlFor(modelId);
	const apiKey = env.CHUB_API_KEY ?? '';

	const textStream = new ReadableStream<string>({
		async start(controller) {
			try {
				if (!apiKey) throw new Error('CHUB_API_KEY not configured');
				const res = await fetch(url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiKey}`
					},
					body: JSON.stringify({
						model: modelId,
						messages: mergeConsecutive(messages),
						stream: true
					})
				});
				if (!res.ok || !res.body) {
					const body = await res.text().catch(() => '');
					throw new Error(`Chub ${res.status}: ${body || res.statusText}`);
				}
				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				let buffer = '';
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() ?? '';
					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed.startsWith('data:')) continue;
						const payload = trimmed.slice(5).trim();
						if (!payload || payload === '[DONE]') continue;
						try {
							const json = JSON.parse(payload) as {
								choices?: { delta?: { content?: string } }[];
							};
							const chunk = json.choices?.[0]?.delta?.content;
							if (chunk) controller.enqueue(chunk);
						} catch {
							/* ignore malformed SSE line */
						}
					}
				}
				controller.close();
			} catch (e) {
				controller.error(e);
			}
		}
	});

	return { textStream };
}

// ─── unified provider call ────────────────────────────────────────────────────

export async function callProvider(
	messages: AIMessage[],
	provider: string,
	geminiModel = 'gemini-2.5-flash',
	chubModel = 'mythomax',
	prefill?: string
): Promise<string> {
	if (provider === 'gemini') {
		return callGemini(messages, geminiModel);
	}
	return callChub(messages, chubModel, prefill);
}

export function streamProvider(
	messages: AIMessage[],
	provider: string,
	geminiModel = 'gemini-2.5-flash',
	chubModel = 'mythomax'
) {
	if (provider === 'gemini') {
		return streamGemini(messages, geminiModel);
	}
	return streamChub(messages, chubModel);
}

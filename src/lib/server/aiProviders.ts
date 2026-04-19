/**
 * AI provider adapters using the Vercel AI SDK.
 *
 * Supports:
 *  - Gemini via @ai-sdk/google (primary for character generation and generic calls)
 *  - Chub AI via @ai-sdk/openai (OpenAI-compatible endpoint)
 *
 * For streaming chat responses, use streamText() from the 'ai' package.
 * For one-shot generation (character pipeline), use generateText().
 */

import { generateText, streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '$env/dynamic/private';

export interface AIMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

// ─── provider factories ───────────────────────────────────────────────────────

function getGeminiModel(modelId: string) {
	const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY ?? '' });
	return google(modelId);
}

function getChubModel(modelId: string) {
	const chub = createOpenAI({
		baseURL: env.CHUB_BASE_URL ?? 'https://mercury.chub.ai/openai',
		apiKey: env.CHUB_API_KEY ?? ''
	});
	return chub(modelId);
}

// ─── generateText wrappers ────────────────────────────────────────────────────

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

export async function callChub(
	messages: AIMessage[],
	modelId = 'mythomax'
): Promise<string> {
	const { text } = await generateText({
		model: getChubModel(modelId),
		messages
	});
	return text;
}

// ─── streaming wrappers ───────────────────────────────────────────────────────

export function streamGemini(messages: AIMessage[], modelId = 'gemini-2.5-flash') {
	return streamText({
		model: getGeminiModel(modelId),
		messages
	});
}

export function streamChub(messages: AIMessage[], modelId = 'mythomax') {
	return streamText({
		model: getChubModel(modelId),
		messages
	});
}

// ─── unified provider call ────────────────────────────────────────────────────

export async function callProvider(
	messages: AIMessage[],
	provider: string,
	geminiModel = 'gemini-2.5-flash',
	chubModel = 'mythomax'
): Promise<string> {
	if (provider === 'gemini') {
		return callGemini(messages, geminiModel);
	}
	return callChub(messages, chubModel);
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

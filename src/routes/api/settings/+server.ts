import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { UserSettings, GEMINI_MODELS, CHUB_MODELS } from '$lib/server/models/UserSettings';
import type { RequestHandler } from '@sveltejs/kit';

// ---------------------------------------------------------------------------
// GET /api/settings
// Returns the user's settings, creating default settings via upsert if none exist.
// ---------------------------------------------------------------------------
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await connectDB();

	const settings = await UserSettings.findOneAndUpdate(
		{ user_id: locals.session.user_id },
		{
			$setOnInsert: {
				auto_delete: false,
				dashboard_layout: 'bento',
				budget_variant: 'standard',
				default_provider: 'gemini',
				gemini_model: 'gemini-2.5-flash',
				chub_model: 'mythomax',
				chat_name: ''
			}
		},
		{ upsert: true, new: true }
	);

	return json(settings);
};

// ---------------------------------------------------------------------------
// PATCH /api/settings
// Updates the user's settings. Only known fields are applied.
// ---------------------------------------------------------------------------
export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

	// Allowlist fields that can be updated — prevents mass-assignment
	const allowedUpdate: Record<string, unknown> = {};
	if (typeof body.auto_delete === 'boolean') {
		allowedUpdate.auto_delete = body.auto_delete;
	}
	if (
		typeof body.dashboard_layout === 'string' &&
		['bento', 'sidebar', 'columns'].includes(body.dashboard_layout)
	) {
		allowedUpdate.dashboard_layout = body.dashboard_layout;
	}
	if (
		typeof body.budget_variant === 'string' &&
		['standard', 'minimal'].includes(body.budget_variant)
	) {
		allowedUpdate.budget_variant = body.budget_variant;
	}
	if (
		typeof body.default_provider === 'string' &&
		['gemini', 'chub'].includes(body.default_provider)
	) {
		allowedUpdate.default_provider = body.default_provider;
	}
	if (
		typeof body.gemini_model === 'string' &&
		(GEMINI_MODELS as readonly string[]).includes(body.gemini_model)
	) {
		allowedUpdate.gemini_model = body.gemini_model;
	}
	if (
		typeof body.chub_model === 'string' &&
		(CHUB_MODELS as readonly string[]).includes(body.chub_model)
	) {
		allowedUpdate.chub_model = body.chub_model;
	}
	if (typeof body.chat_name === 'string') {
		allowedUpdate.chat_name = body.chat_name.trim().slice(0, 50);
	}

	await connectDB();

	const settings = await UserSettings.findOneAndUpdate(
		{ user_id: locals.session.user_id },
		{ $set: allowedUpdate },
		{ upsert: true, new: true }
	);

	return json(settings);
};

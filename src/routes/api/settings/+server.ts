import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { UserSettings } from '$lib/server/models/UserSettings';
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
		{ $setOnInsert: { auto_delete: false } },
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

	await connectDB();

	const settings = await UserSettings.findOneAndUpdate(
		{ user_id: locals.session.user_id },
		{ $set: allowedUpdate },
		{ upsert: true, new: true }
	);

	return json(settings);
};

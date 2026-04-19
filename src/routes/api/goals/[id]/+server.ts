import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Goal } from '$lib/server/models/Goal';
import type { RequestHandler } from '@sveltejs/kit';

// ---------------------------------------------------------------------------
// PATCH /api/goals/[id]
// ---------------------------------------------------------------------------
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
        if (!locals.session) {
                return json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const goal = await Goal.findOne({ _id: params.id });
        if (!goal) {
                return json({ error: 'Goal not found' }, { status: 404 });
        }

        const isAdmin = locals.session.role === 'admin' || locals.session.role === 'temp_admin';
        // Compare as strings to handle ObjectId vs. string mismatches
        const isOwner = String(goal.owner) === String(locals.session.user_id);

        if (!isAdmin && !isOwner) {
                return json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({})) as Record<string, unknown>;

        // Prevent owner from being changed via PATCH
        delete body.owner;

        const updated = await Goal.findOneAndUpdate(
                { _id: params.id },
                { $set: body },
                { returnDocument: 'after' }
        );

        return json(updated);
};

// ---------------------------------------------------------------------------
// DELETE /api/goals/[id]
// ---------------------------------------------------------------------------
export const DELETE: RequestHandler = async ({ params, locals }) => {
        if (!locals.session) {
                return json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const goal = await Goal.findOne({ _id: params.id });
        if (!goal) {
                return json({ error: 'Goal not found' }, { status: 404 });
        }

        const isAdmin = locals.session.role === 'admin' || locals.session.role === 'temp_admin';
        const isOwner = String(goal.owner) === String(locals.session.user_id);

        if (!isAdmin && !isOwner) {
                return json({ error: 'Forbidden' }, { status: 403 });
        }

        await Goal.deleteOne({ _id: params.id });
        return json({ success: true });
};

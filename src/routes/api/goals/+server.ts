import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { Goal } from '$lib/server/models/Goal';
import type { RequestHandler } from '@sveltejs/kit';

// ---------------------------------------------------------------------------
// GET /api/goals
// ---------------------------------------------------------------------------
export const GET: RequestHandler = async ({ locals }) => {
        if (!locals.session) {
                return json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const isAdmin = locals.session.role === 'admin' || locals.session.role === 'temp_admin';
        const query = isAdmin ? {} : { owner: locals.session.user_id };

        const goals = await Goal.find(query);
        return json(goals);
};

// ---------------------------------------------------------------------------
// POST /api/goals
// ---------------------------------------------------------------------------
export const POST: RequestHandler = async ({ request, locals }) => {
        if (!locals.session) {
                return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({})) as Record<string, unknown>;

        if (!body.title) {
                return json({ error: 'title is required' }, { status: 400 });
        }

        await connectDB();

        // Force owner to the authenticated user — prevents spoofing
        const goal = await Goal.create({
                title: body.title,
                note: body.note ?? '',
                category: body.category ?? '',
                completed: body.completed ?? false,
                target_value: body.target_value ?? 1,
                current_value: body.current_value ?? 0,
                start_date: body.start_date,
                due_date: body.due_date,
                owner: locals.session.user_id
        });

        return json(goal, { status: 201 });
};

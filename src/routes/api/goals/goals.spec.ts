import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
        mockGoalFind,
        mockGoalFindOne,
        mockGoalCreate,
        mockGoalFindOneAndUpdate,
        mockGoalDeleteOne
} = vi.hoisted(() => ({
        mockGoalFind: vi.fn(),
        mockGoalFindOne: vi.fn(),
        mockGoalCreate: vi.fn(),
        mockGoalFindOneAndUpdate: vi.fn(),
        mockGoalDeleteOne: vi.fn()
}));

vi.mock('$lib/server/models/Goal', () => ({
        Goal: {
                find: mockGoalFind,
                findOne: mockGoalFindOne,
                create: mockGoalCreate,
                findOneAndUpdate: mockGoalFindOneAndUpdate,
                deleteOne: mockGoalDeleteOne
        }
}));
vi.mock('$lib/server/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------
const userId = new mongoose.Types.ObjectId().toString();
const adminId = new mongoose.Types.ObjectId().toString();

const makeGoal = (override: Record<string, unknown> = {}) => ({
        _id: new mongoose.Types.ObjectId(),
        title: 'Finish project',
        note: '',
        category: '',
        completed: false,
        target_value: 1,
        current_value: 0,
        owner: new mongoose.Types.ObjectId(userId),
        toObject: vi.fn().mockReturnThis(),
        ...override
});

/** Build a minimal SvelteKit event object */
const makeEvent = ({
        method = 'GET',
        body,
        session
}: {
        method?: string;
        body?: Record<string, unknown>;
        session?: { user_id: string; role: string } | null;
}) => ({
        request: new Request(`http://localhost/api/goals`, {
                method,
                headers: body ? { 'Content-Type': 'application/json' } : {},
                body: body ? JSON.stringify(body) : undefined
        }),
        locals: {
                session: session !== undefined ? session : { user_id: userId, role: 'user', ip_type: 'local', token: 't', expires_at: new Date() },
                user: null
        }
});

const makeIdEvent = ({
        method = 'PATCH',
        body,
        id,
        session
}: {
        method?: string;
        body?: Record<string, unknown>;
        id: string;
        session?: { user_id: string; role: string } | null;
}) => ({
        request: new Request(`http://localhost/api/goals/${id}`, {
                method,
                headers: body ? { 'Content-Type': 'application/json' } : {},
                body: body ? JSON.stringify(body) : undefined
        }),
        params: { id },
        locals: {
                session: session !== undefined ? session : { user_id: userId, role: 'user', ip_type: 'local', token: 't', expires_at: new Date() },
                user: null
        }
});

// ---------------------------------------------------------------------------
// GET /api/goals
// ---------------------------------------------------------------------------
describe('GET /api/goals', () => {
        beforeEach(() => {
                vi.resetModules();
                mockGoalFind.mockReset();
        });

        it('returns only the authenticated user\'s goals when role is "user"', async () => {
                const goal = makeGoal();
                mockGoalFind.mockResolvedValue([goal]);
                const { GET } = await import('./+server');
                const res = await GET(makeEvent({ method: 'GET' }) as never);
                expect(res.status).toBe(200);
                // User query must filter by owner
                expect(mockGoalFind).toHaveBeenCalledWith(
                        expect.objectContaining({ owner: userId })
                );
        });

        it('returns all goals when role is "admin"', async () => {
                const goal = makeGoal();
                mockGoalFind.mockResolvedValue([goal]);
                const { GET } = await import('./+server');
                const res = await GET(
                        makeEvent({ method: 'GET', session: { user_id: adminId, role: 'admin' } }) as never
                );
                expect(res.status).toBe(200);
                // Admin query must NOT filter by owner
                expect(mockGoalFind).toHaveBeenCalledWith({});
        });

        it('returns 401 when there is no session', async () => {
                const { GET } = await import('./+server');
                const res = await GET(makeEvent({ method: 'GET', session: null }) as never);
                expect(res.status).toBe(401);
        });
});

// ---------------------------------------------------------------------------
// POST /api/goals
// ---------------------------------------------------------------------------
describe('POST /api/goals', () => {
        beforeEach(() => {
                vi.resetModules();
                mockGoalCreate.mockReset();
        });

        it('creates a goal and forces owner = authenticated user id', async () => {
                const saved = makeGoal();
                mockGoalCreate.mockResolvedValue(saved);
                const { POST } = await import('./+server');
                const res = await POST(
                        makeEvent({
                                method: 'POST',
                                body: { title: 'My goal', target_value: 5, owner: 'spoofed-id' }
                        }) as never
                );
                expect(res.status).toBe(201);
                // owner must be the session user_id, not the spoofed value
                expect(mockGoalCreate).toHaveBeenCalledWith(
                        expect.objectContaining({ owner: userId })
                );
                expect(mockGoalCreate).not.toHaveBeenCalledWith(
                        expect.objectContaining({ owner: 'spoofed-id' })
                );
        });

        it('returns 400 when title is missing', async () => {
                const { POST } = await import('./+server');
                const res = await POST(
                        makeEvent({ method: 'POST', body: { target_value: 5 } }) as never
                );
                expect(res.status).toBe(400);
        });

        it('returns 401 when there is no session', async () => {
                const { POST } = await import('./+server');
                const res = await POST(makeEvent({ method: 'POST', body: { title: 'x' }, session: null }) as never);
                expect(res.status).toBe(401);
        });
});

// ---------------------------------------------------------------------------
// PATCH /api/goals/[id]
// ---------------------------------------------------------------------------
describe('PATCH /api/goals/[id]', () => {
        beforeEach(() => {
                vi.resetModules();
                mockGoalFindOne.mockReset();
                mockGoalFindOneAndUpdate.mockReset();
        });

        it('updates a goal when the user is the owner', async () => {
                const goalId = new mongoose.Types.ObjectId().toString();
                const existing = makeGoal({ _id: goalId, owner: new mongoose.Types.ObjectId(userId) });
                mockGoalFindOne.mockResolvedValue(existing);
                const updated = makeGoal({ _id: goalId, completed: true });
                mockGoalFindOneAndUpdate.mockResolvedValue(updated);

                const { PATCH } = await import('./[id]/+server');
                const res = await PATCH(
                        makeIdEvent({ method: 'PATCH', id: goalId, body: { completed: true } }) as never
                );
                expect(res.status).toBe(200);
        });

        it('returns 403 when a user tries to patch a goal they do not own', async () => {
                const goalId = new mongoose.Types.ObjectId().toString();
                const otherOwner = new mongoose.Types.ObjectId();
                const existing = makeGoal({ _id: goalId, owner: otherOwner });
                mockGoalFindOne.mockResolvedValue(existing);

                const { PATCH } = await import('./[id]/+server');
                const res = await PATCH(
                        makeIdEvent({ method: 'PATCH', id: goalId, body: { completed: true } }) as never
                );
                expect(res.status).toBe(403);
        });

        it('returns 404 when the goal does not exist', async () => {
                mockGoalFindOne.mockResolvedValue(null);
                const { PATCH } = await import('./[id]/+server');
                const res = await PATCH(
                        makeIdEvent({ method: 'PATCH', id: new mongoose.Types.ObjectId().toString(), body: { completed: true } }) as never
                );
                expect(res.status).toBe(404);
        });
});

// ---------------------------------------------------------------------------
// DELETE /api/goals/[id]
// ---------------------------------------------------------------------------
describe('DELETE /api/goals/[id]', () => {
        beforeEach(() => {
                vi.resetModules();
                mockGoalFindOne.mockReset();
                mockGoalDeleteOne.mockReset();
        });

        it('deletes a goal when the user is the owner', async () => {
                const goalId = new mongoose.Types.ObjectId().toString();
                const existing = makeGoal({ _id: goalId, owner: new mongoose.Types.ObjectId(userId) });
                mockGoalFindOne.mockResolvedValue(existing);
                mockGoalDeleteOne.mockResolvedValue({ deletedCount: 1 });

                const { DELETE } = await import('./[id]/+server');
                const res = await DELETE(
                        makeIdEvent({ method: 'DELETE', id: goalId }) as never
                );
                expect(res.status).toBe(200);
        });

        it('returns 403 when a user tries to delete a goal they do not own', async () => {
                const goalId = new mongoose.Types.ObjectId().toString();
                const existing = makeGoal({ _id: goalId, owner: new mongoose.Types.ObjectId() });
                mockGoalFindOne.mockResolvedValue(existing);

                const { DELETE } = await import('./[id]/+server');
                const res = await DELETE(
                        makeIdEvent({ method: 'DELETE', id: goalId }) as never
                );
                expect(res.status).toBe(403);
        });

        it('returns 404 when the goal does not exist', async () => {
                mockGoalFindOne.mockResolvedValue(null);
                const { DELETE } = await import('./[id]/+server');
                const res = await DELETE(
                        makeIdEvent({ method: 'DELETE', id: new mongoose.Types.ObjectId().toString() }) as never
                );
                expect(res.status).toBe(404);
        });
});

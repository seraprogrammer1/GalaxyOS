import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

// We import the model under test after connecting so Mongoose has a live connection.
// The MONGODB_URI must be set to the test DB in the environment.
const MONGODB_URI =
        process.env.MONGODB_URI ?? 'mongodb://localhost:27017/galaxy_test_db';

let Goal: Awaited<ReturnType<typeof import('./Goal').default['then']>>; // resolved below

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const validPayload = () => ({
        title: 'Run a marathon',
        note: 'Train every day',
        category: 'Fitness',
        completed: false,
        target_value: 42,
        current_value: 0,
        start_date: new Date('2026-01-01'),
        due_date: new Date('2026-12-31'),
        owner: new mongoose.Types.ObjectId()
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('Goal model', () => {
        beforeAll(async () => {
                await mongoose.connect(MONGODB_URI);
                // Dynamic import so Mongoose connection is active before model registration
                const mod = await import('./Goal');
                Goal = mod.Goal as never;
        });

        afterAll(async () => {
                await mongoose.connection.dropCollection('goals').catch(() => undefined);
                await mongoose.disconnect();
        });

        it('creates and saves a valid goal with all required fields', async () => {
                const doc = new (Goal as never)(validPayload());
                const saved = await (doc as never).save();
                expect((saved as never).title).toBe('Run a marathon');
                expect((saved as never).completed).toBe(false);
                expect((saved as never).target_value).toBe(42);
                expect((saved as never).createdAt).toBeDefined();
        });

        it('uses sensible defaults: completed = false, current_value = 0', async () => {
                const payload = validPayload();
                delete (payload as Record<string, unknown>).completed;
                delete (payload as Record<string, unknown>).current_value;
                const doc = new (Goal as never)(payload);
                const saved = await (doc as never).save();
                expect((saved as never).completed).toBe(false);
                expect((saved as never).current_value).toBe(0);
        });

        it('throws a ValidationError when title is missing', async () => {
                const payload = validPayload();
                delete (payload as Record<string, unknown>).title;
                const doc = new (Goal as never)(payload);
                await expect((doc as never).save()).rejects.toThrow(/title/i);
        });

        it('throws a ValidationError when owner is missing', async () => {
                const payload = validPayload();
                delete (payload as Record<string, unknown>).owner;
                const doc = new (Goal as never)(payload);
                await expect((doc as never).save()).rejects.toThrow(/owner/i);
        });
});

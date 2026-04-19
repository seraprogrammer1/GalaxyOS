import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

const MONGODB_URI =
	process.env.MONGODB_URI ?? 'mongodb://localhost:27017/galaxy_test_db';

let Chat: Awaited<ReturnType<typeof import('./Chat').default['then']>>;

const validPayload = () => ({
	title: 'Thread 1',
	owner: new mongoose.Types.ObjectId(),
	messages: [{ role: 'user', content: 'Hello' }]
});

describe('Chat model', () => {
	beforeAll(async () => {
		await mongoose.connect(MONGODB_URI);
		const mod = await import('./Chat');
		Chat = mod.Chat as never;
	});

	afterAll(async () => {
		await mongoose.connection.dropCollection('chats').catch(() => undefined);
		await mongoose.disconnect();
	});

	it('requires owner', async () => {
		const payload = validPayload();
		delete (payload as Record<string, unknown>).owner;
		const doc = new (Chat as never)(payload);
		await expect((doc as never).save()).rejects.toThrow(/owner/i);
	});

	it('rejects messages with invalid role', async () => {
		const payload = validPayload();
		(payload as { messages: Array<{ role: string; content: string }> }).messages = [
			{ role: 'robot', content: 'invalid' }
		];
		const doc = new (Chat as never)(payload);
		await expect((doc as never).save()).rejects.toThrow(/`robot` is not a valid enum value/i);
	});

	it('accepts valid message roles', async () => {
		const doc = new (Chat as never)({
			...validPayload(),
			messages: [
				{ role: 'system', content: 'You are helpful.' },
				{ role: 'user', content: 'Hi' },
				{ role: 'assistant', content: 'Hello there' }
			]
		});

		const saved = await (doc as never).save();
		expect((saved as never).messages).toHaveLength(3);
		expect((saved as never).created_at).toBeDefined();
		expect((saved as never).updated_at).toBeDefined();
	});
});
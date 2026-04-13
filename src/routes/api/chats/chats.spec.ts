import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

const { mockChatFind, mockChatCreate, mockChatFindOne } = vi.hoisted(() => ({
	mockChatFind: vi.fn(),
	mockChatCreate: vi.fn(),
	mockChatFindOne: vi.fn()
}));

vi.mock('$lib/server/models/Chat', () => ({
	Chat: {
		find: mockChatFind,
		create: mockChatCreate,
		findOne: mockChatFindOne
	}
}));
vi.mock('$lib/server/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const userId = new mongoose.Types.ObjectId().toString();
const otherUserId = new mongoose.Types.ObjectId().toString();

const makeSession = (id = userId) => ({
	user_id: id,
	role: 'user',
	ip_type: 'local' as const,
	token: 't',
	expires_at: new Date()
});

const makeEvent = ({
	method = 'GET',
	body,
	session
}: {
	method?: string;
	body?: Record<string, unknown>;
	session?: ReturnType<typeof makeSession> | null;
}) => ({
	request: new Request('http://localhost/api/chats', {
		method,
		headers: body ? { 'Content-Type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	}),
	locals: {
		session: session !== undefined ? session : makeSession(),
		user: null
	}
});

const makeMessageEvent = ({
	chatId,
	body,
	session
}: {
	chatId: string;
	body?: Record<string, unknown>;
	session?: ReturnType<typeof makeSession> | null;
}) => ({
	request: new Request(`http://localhost/api/chats/${chatId}/message`, {
		method: 'POST',
		headers: body ? { 'Content-Type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	}),
	params: { id: chatId },
	locals: {
		session: session !== undefined ? session : makeSession(),
		user: null
	}
});

describe('GET /api/chats', () => {
	beforeEach(() => {
		vi.resetModules();
		mockChatFind.mockReset();
	});

	it('returns only chats for authenticated user', async () => {
		mockChatFind.mockResolvedValue([{ _id: 'c1' }]);
		const { GET } = await import('./+server');
		const res = await GET(makeEvent({ method: 'GET' }) as never);

		expect(res.status).toBe(200);
		expect(mockChatFind).toHaveBeenCalledWith({ owner: userId });
	});

	it('returns 401 without session', async () => {
		const { GET } = await import('./+server');
		const res = await GET(makeEvent({ method: 'GET', session: null }) as never);
		expect(res.status).toBe(401);
	});
});

describe('POST /api/chats', () => {
	beforeEach(() => {
		vi.resetModules();
		mockChatCreate.mockReset();
	});

	it('creates a chat with owner from session', async () => {
		mockChatCreate.mockResolvedValue({ _id: 'c1', title: 'New Chat', owner: userId, messages: [] });
		const { POST } = await import('./+server');
		const res = await POST(makeEvent({ method: 'POST', body: { title: 'Thread A', owner: 'spoofed' } }) as never);

		expect(res.status).toBe(201);
		expect(mockChatCreate).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Thread A', owner: userId })
		);
	});
});

describe('POST /api/chats/[id]/message', () => {
	beforeEach(() => {
		vi.resetModules();
		mockChatFindOne.mockReset();
		vi.stubGlobal('fetch', vi.fn());
	});

	it('saves user message then assistant response in order', async () => {
		const chatId = new mongoose.Types.ObjectId().toString();
		const save = vi.fn().mockResolvedValue(undefined);
		const chatDoc = {
			_id: chatId,
			owner: userId,
			messages: [{ role: 'system', content: 'You are helpful.' }],
			save
		};

		mockChatFindOne.mockResolvedValue(chatDoc);
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({ text: 'Mock AI response: Hello AI' })
		} as never);

		const { POST } = await import('./[id]/message/+server');
		const res = await POST(
			makeMessageEvent({ chatId, body: { content: 'Hello AI' } }) as never
		);

		expect(res.status).toBe(200);
		expect(save).toHaveBeenCalledTimes(2);
		expect(chatDoc.messages[1]).toEqual({ role: 'user', content: 'Hello AI' });
		expect(chatDoc.messages[2]).toEqual({ role: 'assistant', content: 'Mock AI response: Hello AI' });
		expect(fetch).toHaveBeenCalledWith(
			'http://127.0.0.1:8000/api/generate',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('returns 403 if user does not own chat', async () => {
		const chatId = new mongoose.Types.ObjectId().toString();
		mockChatFindOne.mockResolvedValue({
			_id: chatId,
			owner: otherUserId,
			messages: [],
			save: vi.fn().mockResolvedValue(undefined)
		});

		const { POST } = await import('./[id]/message/+server');
		const res = await POST(
			makeMessageEvent({ chatId, body: { content: 'Hello' }, session: makeSession(userId) }) as never
		);

		expect(res.status).toBe(403);
	});
});
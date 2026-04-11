import { json } from '@sveltejs/kit';
import { isLocalIP } from '$lib/server/network';
import { Session } from '$lib/server/models/Session';
import { connectDB } from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';

const GUEST_SESSION_TTL_MS = 4 * 3600_000; // 4 hours

export const POST: RequestHandler = async ({ getClientAddress, cookies }) => {
	const ip = getClientAddress();

	if (!isLocalIP(ip)) {
		return json({ error: 'Guest access is only available on the local network' }, { status: 403 });
	}

	await connectDB();

	const token = crypto.randomUUID();
	await Session.create({
		token,
		role: 'guest',
		ip_type: 'local',
		expires_at: new Date(Date.now() + GUEST_SESSION_TTL_MS)
	});

	cookies.set('session', token, {
		httpOnly: true,
		sameSite: 'strict',
		path: '/',
		maxAge: GUEST_SESSION_TTL_MS / 1000
	});

	return json({ success: true, role: 'guest' });
};

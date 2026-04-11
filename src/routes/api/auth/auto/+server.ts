import { json } from '@sveltejs/kit';
import { isLocalIP } from '$lib/server/network';
import { Session } from '$lib/server/models/Session';
import { User } from '$lib/server/models/User';
import { connectDB } from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';


const AUTO_SESSION_TTL_MS = 8 * 3600_000; // 8 hours

export const POST: RequestHandler = async ({ getClientAddress }) => {
	const ip = getClientAddress();

	if (!isLocalIP(ip)) {
		return json({ error: 'Auto-login is only available on the local network' }, { status: 403 });
	}

	await connectDB();

	const adminUser = await User.findOne({ role: 'admin' });
	if (!adminUser) {
		return json({ error: 'No admin user found' }, { status: 404 });
	}

	const token = crypto.randomUUID();
	await Session.create({
		token,
		user_id: adminUser._id,
		role: 'admin',
		ip_type: 'local',
		expires_at: new Date(Date.now() + AUTO_SESSION_TTL_MS)
	});

	const response = json({ success: true, role: 'admin' });
	response.headers.set(
		'set-cookie',
		`session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${AUTO_SESSION_TTL_MS / 1000}`
	);

	return response;
};

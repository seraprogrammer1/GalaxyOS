import bcrypt from 'bcrypt';
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { User } from '$lib/server/models/User';
import { Session } from '$lib/server/models/Session';
import { isLocalIP } from '$lib/server/network';
import type { RequestHandler } from '@sveltejs/kit';

const SESSION_TTL_MS = 8 * 3600_000; // 8 hours

export const POST: RequestHandler = async ({ request, getClientAddress, cookies }) => {
        const body = await request.json().catch(() => ({}));
        const { username, password } = body as Record<string, string>;

        if (!username || !password) {
                return json({ error: 'Username and password are required' }, { status: 400 });
        }

        await connectDB();

        const user = await User.findOne({ username });
        if (!user) {
                return json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash as string);
        if (!passwordMatch) {
                return json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const ip = getClientAddress();
        // test-force-external cookie lets Playwright simulate an external-IP connection
        // so the pending_pin multi-stage admin flow can be exercised from localhost.
        const forceExternal = !!cookies.get('test-force-external');
        const isLocal = !forceExternal && isLocalIP(ip);
        const ip_type = isLocal ? 'local' : 'external';

        // External admin must complete a second factor (PIN) before getting full access
        const role =
                user.role === 'admin' && !isLocal
                        ? 'pending_pin'
                        : (user.role as string);

        const token = crypto.randomUUID();
        await Session.create({
                token,
                user_id: user._id,
                role,
                ip_type,
                expires_at: new Date(Date.now() + SESSION_TTL_MS)
        });

        const response = json({ success: true, role });
        response.headers.set(
                'set-cookie',
                `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`
        );

        return response;
};
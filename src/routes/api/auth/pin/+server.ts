import { json } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import { isLocalIP } from '$lib/server/network';
import { Session } from '$lib/server/models/Session';
import { User } from '$lib/server/models/User';
import { connectDB } from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';

const SESSION_TTL_MS = 8 * 3600_000; // 8 hours

export const POST: RequestHandler = async ({ request, getClientAddress, cookies }) => {
        const body = await request.json().catch(() => ({}));
        const { pin } = body as Record<string, string>;

        if (!pin) {
                return json({ error: 'PIN is required' }, { status: 400 });
        }

        await connectDB();

        const ip = getClientAddress();
        // Mirror the login endpoint: test-force-external makes the PIN endpoint
        // use the external upgrade path (pending_pin → admin) instead of local temp_admin.
        const forceExternal = !!cookies.get('test-force-external');
        const isLocal = !forceExternal && isLocalIP(ip);

        // ── Local PIN login → creates a temp_admin session ──────────────────────────
        if (isLocal) {
                const adminUser = await User.findOne({ role: 'admin', admin_pin_hash: { $exists: true } });
                if (!adminUser) {
                        return json({ error: 'No admin PIN configured' }, { status: 404 });
                }

                const match = await bcrypt.compare(pin, adminUser.admin_pin_hash as string);
                if (!match) {
                        return json({ error: 'Invalid PIN' }, { status: 401 });
                }

                const token = crypto.randomUUID();
                await Session.create({
                        token,
                        user_id: adminUser._id,
                        role: 'temp_admin',
                        ip_type: 'local',
                        expires_at: new Date(Date.now() + SESSION_TTL_MS)
                });

                cookies.set('session', token, {
                        httpOnly: true,
                        sameSite: 'strict',
                        path: '/',
                        maxAge: SESSION_TTL_MS / 1000
                });

                return json({ success: true, role: 'temp_admin' });
        }

        // ── External PIN upgrade: pending_pin → admin ────────────────────────────────
        const existingToken = cookies.get('session');
        if (!existingToken) {
                return json({ error: 'No active session to upgrade' }, { status: 401 });
        }

        const pendingSession = await Session.findOne({ token: existingToken });
        if (!pendingSession || pendingSession.role !== 'pending_pin') {
                return json({ error: 'Session is not in pending_pin state' }, { status: 403 });
        }

        const adminUser = await User.findOne({ _id: pendingSession.user_id });
        if (!adminUser) {
                return json({ error: 'User not found' }, { status: 404 });
        }

        const match = await bcrypt.compare(pin, adminUser.admin_pin_hash as string);
        if (!match) {
                return json({ error: 'Invalid PIN' }, { status: 401 });
        }

        // Delete the pending session and create a full admin session
        await Session.deleteOne({ token: existingToken });
        const newToken = crypto.randomUUID();
        await Session.create({
                token: newToken,
                user_id: adminUser._id,
                role: 'admin',
                ip_type: 'external',
                expires_at: new Date(Date.now() + SESSION_TTL_MS)
        });

        cookies.set('session', newToken, {
                httpOnly: true,
                sameSite: 'strict',
                path: '/',
                maxAge: SESSION_TTL_MS / 1000
        });

        return json({ success: true, role: 'admin' });
};
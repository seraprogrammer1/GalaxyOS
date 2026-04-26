import { connectDB } from '$lib/server/db';
import { seedDatabase } from '$lib/server/seeder';
import { runMigrations } from '$lib/server/migrationRunner';
import { startSyncScheduler } from '$lib/server/syncScheduler';
import { Session } from '$lib/server/models/Session';
import { User } from '$lib/server/models/User';
import type { Handle } from '@sveltejs/kit';
import 'dotenv/config';

// Run once on server boot
let booted = false;
async function boot() {
	if (booted) return;
	booted = true;
	await connectDB();
	await runMigrations(); // apply any pending schema migrations
	await seedDatabase();
	startSyncScheduler();
}

export const handle: Handle = async ({ event, resolve }) => {
	await boot();

	const token = event.cookies.get('session');
	event.locals.session = null;
	event.locals.user = null;

	if (token) {
		try {
			const sessionDoc = await Session.findOne({ token, expires_at: { $gt: new Date() } });
			if (sessionDoc) {
				event.locals.session = {
					token: sessionDoc.token as string,
					user_id: sessionDoc.user_id ? String(sessionDoc.user_id) : undefined,
					role: sessionDoc.role as string,
					ip_type: sessionDoc.ip_type as 'local' | 'external',
					expires_at: sessionDoc.expires_at as Date
				};
				// Populate legacy user local for backwards compatibility
				if (sessionDoc.user_id) {
					const userDoc = await User.findById(sessionDoc.user_id).lean();
					event.locals.user = {
						id: String(sessionDoc.user_id),
						username: (userDoc as Record<string, unknown>)?.username as string ?? '',
						role: sessionDoc.role as string
					};
				}
			} else {
				// Expired or invalid token — clear the cookie
				event.cookies.delete('session', { path: '/' });
			}
		} catch {
			event.cookies.delete('session', { path: '/' });
		}
	}

	return resolve(event);
};

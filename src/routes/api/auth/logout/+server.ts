import { redirect } from '@sveltejs/kit';
import { Session } from '$lib/server/models/Session';
import { connectDB } from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('session');
	if (token) {
		await connectDB();
		await Session.deleteOne({ token });
		cookies.delete('session', { path: '/' });
	}
	redirect(302, '/login');
};

import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';

const PUBLIC_ROUTES = ['/login', '/api/auth/login'];

export const load: ServerLoad = async ({ locals, url }) => {
	const isPublic = PUBLIC_ROUTES.some(
		(route) => url.pathname === route || url.pathname.startsWith('/api/')
	);

	if (!locals.session && !isPublic) {
		redirect(302, '/login');
	}

	return { user: locals.user, session: locals.session };
};

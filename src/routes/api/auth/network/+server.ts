import { json } from '@sveltejs/kit';
import { isLocalIP } from '$lib/server/network';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ getClientAddress }) => {
	const ip = getClientAddress();
	const ip_type = isLocalIP(ip) ? 'local' : 'external';
	return json({ ip_type });
};

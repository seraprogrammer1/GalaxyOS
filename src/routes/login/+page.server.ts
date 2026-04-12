import { redirect } from '@sveltejs/kit';
import { isLocalIP } from '$lib/server/network';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async (event) => {
        const { locals, getClientAddress, fetch, cookies } = event;

        if (locals.session) {
                redirect(302, '/dashboard');
        }

        const isLocal = isLocalIP(getClientAddress()) && !cookies.get('test-disable-auto');

        if (isLocal) {
                const res = await fetch('/api/auth/auto', { method: 'POST' });
                if (res.ok) {
                        // Forward the session cookie from the sub-response to the browser
                        const setCookieHeader = res.headers?.get?.('set-cookie') ?? '';
                        const token = setCookieHeader.match(/session=([^;]+)/)?.[1];
                        if (token) {
                                cookies.set('session', token, {
                                        httpOnly: true,
                                        sameSite: 'strict',
                                        path: '/',
                                        maxAge: 8 * 3600
                                });
                        }
                        redirect(302, '/dashboard');
                }
                return { isLocal: true, autoLoginFailed: true };
        }

        return { isLocal: false };
};
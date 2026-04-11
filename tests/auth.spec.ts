import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Test A: Unauthenticated guard — /dashboard returns 302 → /login at HTTP level
// ---------------------------------------------------------------------------
test('Test A – guards: GET /dashboard without session returns 302 redirect to /login', async ({
	page
}) => {
	// Use page.request.fetch with maxRedirects:0 to see the raw server redirect
	// without the browser following it (which would trigger auto-login)
	const response = await page.request.fetch('/dashboard', {
		method: 'GET',
		maxRedirects: 0
	});

	expect(response.status()).toBe(302);
	const location = response.headers()['location'] ?? '';
	expect(location).toMatch(/login/);
});

// ---------------------------------------------------------------------------
// Test B: Auto-Login — local context triggers auto-login and lands on /dashboard
// ---------------------------------------------------------------------------
test('Test B – auto-login: POST /api/auth/auto sets cookie and redirects to /dashboard', async ({
	page,
	context
}) => {
	// Directly call the auto-login endpoint (Playwright runs against localhost → local IP)
	const response = await page.request.post('/api/auth/auto');
	expect(response.status()).toBe(200);
	const body = await response.json();
	expect(body.success).toBe(true);
	expect(body.role).toBe('admin');

	// The endpoint sets a Set-Cookie header; extract and inject into browser context
	const setCookieHeader = response.headers()['set-cookie'] ?? '';
	const token = setCookieHeader.match(/session=([^;]+)/)?.[1];
	expect(token).toBeTruthy();

	await context.addCookies([
		{
			name: 'session',
			value: token!,
			domain: 'localhost',
			path: '/',
			httpOnly: true,
			sameSite: 'Strict'
		}
	]);

	// Now navigating to / should stay on the app (not redirect to /login)
	await page.goto('/');
	await expect(page).not.toHaveURL(/\/login/);

	// Session cookie should be present in the browser context
	const cookies = await context.cookies();
	const sessionCookie = cookies.find((c) => c.name === 'session');
	expect(sessionCookie).toBeDefined();
	expect(sessionCookie?.value).toBe(token);
});

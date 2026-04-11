import { test, expect } from '@playwright/test';

// Helper: authenticate the browser context via auto-login
async function authenticate(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext) {
	const response = await page.request.post('/api/auth/auto');
	expect(response.status()).toBe(200);
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
}

// ---------------------------------------------------------------------------
// Layout shell assertions
// ---------------------------------------------------------------------------
test('layout: <header> is visible and contains "Galaxy OS"', async ({ page, context }) => {
	await authenticate(page, context);
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const header = page.locator('header');
	await expect(header).toBeVisible();
	await expect(header).toContainText('Galaxy OS');
});

test('layout: Header contains a Logout button', async ({ page, context }) => {
	await authenticate(page, context);
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const logoutButton = page.getByRole('button', { name: /logout/i });
	await expect(logoutButton).toBeVisible();
});

// ---------------------------------------------------------------------------
// Theme assertions
// ---------------------------------------------------------------------------
test('theme: body background color matches Light Cosmic base (#fafafa)', async ({ page, context }) => {
	await authenticate(page, context);
	await page.goto('/');

	// Evaluate the CSS custom property on the .app-shell (which has data-theme attribute)
	const bgColor = await page.evaluate(() => {
		const shell = document.querySelector('.app-shell') as HTMLElement;
		return getComputedStyle(shell).backgroundColor;
	});

	// The Light Cosmic bg-base is #fafafa → rgb(250, 250, 250)
	expect(bgColor).toBe('rgb(250, 250, 250)');
});

test('theme: --bg-base CSS variable is set to #fafafa on :root', async ({ page, context }) => {
	await authenticate(page, context);
	await page.goto('/');

	const bgBase = await page.evaluate(() =>
		getComputedStyle(document.documentElement).getPropertyValue('--bg-base').trim()
	);

	expect(bgBase).toBe('#fafafa');
});

// ---------------------------------------------------------------------------
// Logout flow
// ---------------------------------------------------------------------------
test('layout: clicking Logout invalidates the old session token', async ({ page, context }) => {
	await authenticate(page, context);

	// Capture the original session token before logout
	const cookiesBefore = await context.cookies();
	const tokenBefore = cookiesBefore.find((c) => c.name === 'session')?.value;
	expect(tokenBefore).toBeTruthy();

	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: /logout/i }).click();

	// Wait for post-logout navigation to settle (auto-login may redirect to /dashboard)
	await page.waitForLoadState('networkidle');

	// The OLD session token must no longer be a valid session.
	// Verify by making a raw HTTP request to a protected endpoint using the old token:
	// it should get a redirect (not a 200), because the session was deleted from DB.
	const check = await page.request.fetch('/dashboard', {
		method: 'GET',
		headers: { Cookie: `session=${tokenBefore}` },
		maxRedirects: 0
	});
	// An invalid/deleted session should redirect to /login (302)
	expect(check.status()).toBe(302);
	expect(check.headers()['location'] ?? '').toMatch(/login/);
});

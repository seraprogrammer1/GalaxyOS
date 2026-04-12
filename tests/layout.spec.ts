import { test, expect } from '@playwright/test';

// Helper: authenticate the browser context via auto-login
async function authenticate(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext) {
        const response = await page.request.post('/api/auth/auto');
        expect(response.ok()).toBeTruthy();
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

test('layout: authenticates, accesses /dashboard, checks Header and background color', async ({ page, context }) => {
        // Authenticate the session
        await authenticate(page, context);

        // Navigate to /dashboard
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Inspect the DOM. Assert that the Header text "Galaxy OS" is visible
        const header = page.locator('header');
        await expect(header).toBeVisible();
        await expect(header).toContainText('Galaxy OS');

        // Assert the computed CSS of the <body> or <main> element matches the "Light Cosmic" background color
        const bgColors = await page.evaluate(() => {
                const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                const shellBg = window.getComputedStyle(document.querySelector('.app-shell') || document.body).backgroundColor;
                return [bodyBg, shellBg];
        });
        
        // Light Cosmic --bg-base is #fafafa (rgb(250, 250, 250))
        // Either body or the app-shell will have it.
        const targetColor = 'rgb(250, 250, 250)';
        expect(bgColors).toContain(targetColor);
});

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

test('layout: shows sidebar and updates active state on settings navigation', async ({ page, context }) => {
        // Authenticate the session
        await authenticate(page, context);

        // Navigate to /dashboard
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Assert sidebar is visible and positioned left
        const sidebar = page.locator('[data-testid="sidebar"]');
        await expect(sidebar).toBeVisible();
        const bounds = await sidebar.boundingBox();
        expect(bounds).toBeTruthy();
        expect(bounds!.x).toBeLessThan(30);

        // Dashboard is active by default on /dashboard
        await expect(page.locator('a[href="/dashboard"]')).toHaveClass(/is-active/);

        // Navigate using sidebar
        await page.locator('a[href="/settings"]').click();
        await expect(page).toHaveURL(/.*\/settings/);

        // Settings link should become active
        await expect(page.locator('a[href="/settings"]')).toHaveClass(/is-active/);

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

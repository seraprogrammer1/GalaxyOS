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

test('ui-states: opening Modal Store shows Modal DOM and backdrop blur CSS is actively applied', async ({ page, context }) => {
        // Authenticate the session
        await authenticate(page, context);

        // Navigate to /dashboard
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Trigger the Modal Store
        const debugButton = page.locator('[data-testid="debug-open-modal"]');
        await expect(debugButton).toBeVisible();
        await debugButton.click();

        // Assert that the Modal DOM element appears
        const modalHost = page.locator('.backdrop');
        await expect(modalHost).toBeVisible();
        
        const modalContainer = modalHost.locator('.modal-container');
        await expect(modalContainer).toBeVisible();

        // Assert the backdrop blur CSS is actively applied
        const filterStr = await page.evaluate(() => {
                const el = document.querySelector('.backdrop');
                if (!el) return '';
                const style = window.getComputedStyle(el);
                return style.backdropFilter || style.webkitBackdropFilter || '';
        });

        // The blur is configured as blur(6px)
        expect(filterStr).toContain('blur');
});

import { test, expect } from '@playwright/test';

test('auth redirect: unauthenticated user accessing /dashboard redirects to /login', async ({ page, context }) => {
        // Set a cookie to signal the server to skip the "auto-login on localhost" behavior
        // so that the browser URL can actually settle and remain on /login.
        await context.addCookies([
                {
                        name: 'test-disable-auto',
                        value: '1',
                        domain: 'localhost',
                        path: '/',
                }
        ]);

        // Launch a headless browser, navigate to dashboard
        await page.goto('/dashboard');
        
        // Verify the redirect
        await expect(page).toHaveURL(/.*login/);
});

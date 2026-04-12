import { test, expect } from '@playwright/test';
import { seedTestUsers, clearTestDB } from './utils/db';

test.beforeAll(async () => {
        await seedTestUsers();
});

test.afterAll(async () => {
        await clearTestDB();
});

test('user flow: standard login bypasses PIN pad and redirects directly to /dashboard', async ({
        page,
        context
}) => {
        // ── Feature Toggle ────────────────────────────────────────────────────────
        // Block browser-side auto-login so the credential form is shown.
        await page.route('**/api/auth/auto', (route) => route.fulfill({ status: 403 }));

        // test-disable-auto prevents server-side auto-login on the login page.
        // test-force-external makes the login API treat this as an external connection,
        // but for a standard "user" role there is no PIN step — so the user is redirected
        // to /dashboard immediately after credentials are accepted.
        await context.addCookies([
                { name: 'test-disable-auto', value: '1', domain: 'localhost', path: '/' },
                { name: 'test-force-external', value: '1', domain: 'localhost', path: '/' }
        ]);

        // ── Action: Fill credentials and log in ───────────────────────────────────
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Scope interactions to the credential section to avoid strict-mode conflicts.
        const credSection = page.getByRole('region', { name: 'Username and password login' });
        await expect(credSection).toBeVisible();

        await credSection.getByRole('textbox', { name: 'Username' }).fill('testuser');
        await credSection.getByLabel('Password').fill('testpass');
        await credSection.getByRole('button', { name: 'Login' }).click();

        // ── Assert: PIN pad never appears; user lands on /dashboard ───────────────
        // Standard users skip the pending_pin step entirely.
        await expect(
                page.getByRole('region', { name: 'Admin PIN verification' })
        ).not.toBeVisible();

        await expect(page).toHaveURL(/.*dashboard/);
});

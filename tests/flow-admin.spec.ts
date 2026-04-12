import { test, expect } from '@playwright/test';
import { seedTestUsers, clearTestDB } from './utils/db';

test.beforeAll(async () => {
        await seedTestUsers();
});

test.afterAll(async () => {
        await clearTestDB();
});

test('admin flow: multi-stage login (credentials → PIN pad → dashboard)', async ({
        page,
        context
}) => {
        // ── Feature Toggle ────────────────────────────────────────────────────────
        // Block browser-side calls to the auto-login endpoint.
        await page.route('**/api/auth/auto', (route) => route.fulfill({ status: 403 }));

        // Set server-side test cookies:
        //   test-disable-auto   → prevents the login page server from auto-logging in
        //   test-force-external → makes the login/pin APIs treat this as an external IP,
        //                         so the admin gets a "pending_pin" session instead of
        //                         an immediate "admin" session.
        await context.addCookies([
                { name: 'test-disable-auto', value: '1', domain: 'localhost', path: '/' },
                { name: 'test-force-external', value: '1', domain: 'localhost', path: '/' }
        ]);

        // ── Action 1: Fill in credentials and log in ─────────────────────────────
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Scope all interactions to the credential section to avoid strict-mode
        // conflicts with the section's own aria-label containing "Username".
        const credSection = page.getByRole('region', { name: 'Username and password login' });
        await expect(credSection).toBeVisible();

        await credSection.getByRole('textbox', { name: 'Username' }).fill('testadmin');
        await credSection.getByLabel('Password').fill('testpass');
        await credSection.getByRole('button', { name: 'Login' }).click();

        // ── Assert 1: PIN verification form appears ───────────────────────────────
        // The login response returns role: "pending_pin", which triggers the PIN pad.
        const pinSection = page.getByRole('region', { name: 'Admin PIN verification' });
        await expect(pinSection).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Verify Admin PIN' })).toBeVisible();

        // ── Action 2: Enter the correct PIN ──────────────────────────────────────
        await pinSection.getByLabel('PIN').fill('1234');
        await pinSection.getByRole('button', { name: 'Verify' }).click();

        // ── Assert 2: Redirected to /dashboard as a fully authenticated admin ─────
        await expect(page).toHaveURL(/.*dashboard/);
});

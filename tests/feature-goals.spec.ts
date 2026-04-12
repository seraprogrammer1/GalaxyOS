import { test, expect } from '@playwright/test';
import { seedTestUsers, clearTestDB } from './utils/db';

test.beforeAll(async () => {
	await seedTestUsers();
});

test.afterAll(async () => {
	await clearTestDB();
});

// Helper: log in as testuser via the credential form and land on /dashboard
async function loginAsTestUser(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext) {
	await page.route('**/api/auth/auto', (route) => route.fulfill({ status: 403 }));
	await context.addCookies([
		{ name: 'test-disable-auto', value: '1', domain: 'localhost', path: '/' }
	]);

	await page.goto('/login');
	await page.waitForLoadState('networkidle');

	const credSection = page.getByRole('region', { name: 'Username and password login' });
	await expect(credSection).toBeVisible();

	await credSection.getByRole('textbox', { name: 'Username' }).fill('testuser');
	await credSection.getByLabel('Password').fill('testpass');
	await credSection.getByRole('button', { name: 'Login' }).click();

	await expect(page).toHaveURL(/.*dashboard/);
	// Wait for full hydration + Goals.svelte initial data fetch
	await page.waitForLoadState('networkidle');
}

test('goals widget: renders on dashboard after login', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await expect(page.locator('[data-testid="goals-widget"]')).toBeVisible();
});

test('goals widget: add-goal button opens GoalModal', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await page.locator('[data-testid="add-goal-btn"]').click();

	await expect(page.locator('[data-testid="goal-modal"]')).toBeVisible();
});

test('goals widget: create goal via modal and see it in the list', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	// Open modal
	await page.locator('[data-testid="add-goal-btn"]').click();
	await expect(page.locator('[data-testid="goal-modal"]')).toBeVisible();

	// Fill and submit the form
	await page.locator('[data-testid="goal-modal"]').getByLabel('Title').fill('E2E Test Goal');
	await page.locator('[data-testid="goal-modal"]').getByRole('button', { name: /save|create/i }).click();

	// Modal should close
	await expect(page.locator('[data-testid="goal-modal"]')).not.toBeVisible();

	// New goal should appear in the list
	await expect(page.locator('[data-testid="goals-list"]')).toContainText('E2E Test Goal');
});

test('goals widget: toggle goal completed state', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	// Ensure at least one goal exists — create one first
	await page.locator('[data-testid="add-goal-btn"]').click();
	await expect(page.locator('[data-testid="goal-modal"]')).toBeVisible();
	await page.locator('[data-testid="goal-modal"]').getByLabel('Title').fill('Toggle Test Goal');
	await page.locator('[data-testid="goal-modal"]').getByRole('button', { name: /save|create/i }).click();
	await expect(page.locator('[data-testid="goal-modal"]')).not.toBeVisible();

	// Find the first goal item and its checkbox
	const firstGoal = page.locator('[data-testid="goal-item"]').first();
	await expect(firstGoal).toBeVisible();

	const checkbox = firstGoal.locator('input[type="checkbox"]');
	const wasChecked = await checkbox.isChecked();
	await checkbox.click();

	// After toggle the state should have flipped
	await expect(checkbox).toBeChecked({ checked: !wasChecked });
});

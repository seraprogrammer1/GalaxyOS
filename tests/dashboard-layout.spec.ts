import { test, expect } from '@playwright/test';
import { seedTestUsers, clearTestDB } from './utils/db';

test.beforeAll(async () => {
	await seedTestUsers();
});

test.afterAll(async () => {
	await clearTestDB();
});

// Helper: log in as testuser via the credential form and land on /dashboard
async function loginAsTestUser(
	page: import('@playwright/test').Page,
	context: import('@playwright/test').BrowserContext
) {
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
	await page.waitForLoadState('networkidle');
}

test('dashboard layout: greeting with username is visible', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await expect(page.getByText('Hello, testuser')).toBeVisible();
});

test('dashboard layout: Goals widget is visible', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await expect(page.locator('[data-testid="goals-widget"]')).toBeVisible();
});

test('dashboard layout: Budget widget is visible', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await expect(page.locator('[data-testid="budget-widget"]')).toBeVisible();
});

test('dashboard layout: Recent Chats widget is visible', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await expect(page.locator('[data-testid="recent-chats-widget"]')).toBeVisible();
});

test('dashboard layout: NACA widget is visible', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await expect(page.locator('[data-testid="naca-widget"]')).toBeVisible();
});

test('dashboard layout: all four widgets visible simultaneously', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await expect(page.locator('[data-testid="goals-widget"]')).toBeVisible();
	await expect(page.locator('[data-testid="budget-widget"]')).toBeVisible();
	await expect(page.locator('[data-testid="recent-chats-widget"]')).toBeVisible();
	await expect(page.locator('[data-testid="naca-widget"]')).toBeVisible();
});

test('dashboard layout: html and body do not scroll vertically', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
	await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
});

test('dashboard layout: changing layout updates container immediately', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	const dashboard = page.locator('[data-testid="dashboard-root"]');
	await expect(dashboard).toHaveAttribute('data-layout', 'bento');

	await page.locator('[data-testid="layout-select"]').selectOption('sidebar');
	await expect(dashboard).toHaveAttribute('data-layout', 'sidebar');

	await page.locator('[data-testid="layout-select"]').selectOption('columns');
	await expect(dashboard).toHaveAttribute('data-layout', 'columns');
});

test('dashboard layout: selected layout persists after refresh', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	const patchCompleted = page.waitForResponse(
		(response) =>
			response.url().includes('/api/settings') &&
			response.request().method() === 'PATCH' &&
			response.ok()
	);
	await page.locator('[data-testid="layout-select"]').selectOption('sidebar');
	await patchCompleted;
	await expect(page.locator('[data-testid="dashboard-root"]')).toHaveAttribute(
		'data-layout',
		'sidebar'
	);

	await page.reload();
	await page.waitForLoadState('networkidle');

	await expect(page.locator('[data-testid="dashboard-root"]')).toHaveAttribute(
		'data-layout',
		'sidebar'
	);
});

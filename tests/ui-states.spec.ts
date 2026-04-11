import { test, expect } from '@playwright/test';

async function authenticate(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext) {
	const response = await page.request.post('/api/auth/auto');
	const setCookieHeader = response.headers()['set-cookie'] ?? '';
	const token = setCookieHeader.match(/session=([^;]+)/)?.[1];
	if (token) {
		await context.addCookies([
			{
				name: 'session',
				value: token,
				domain: 'localhost',
				path: '/',
				httpOnly: true,
				sameSite: 'Strict'
			}
		]);
	}
}

// ---------------------------------------------------------------------------
// Step 3A: Modal Manager
// ---------------------------------------------------------------------------
test('modal: clicking the debug trigger opens the modal backdrop', async ({ page, context }) => {
	await authenticate(page, context);
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	// Open the modal via the debug trigger button
	const trigger = page.getByTestId('debug-open-modal');
	await expect(trigger).toBeVisible();
	await trigger.click();

	// ModalHost backdrop should appear
	const backdrop = page.locator('.backdrop');
	await expect(backdrop).toBeVisible();
});

test('modal: modal container mounts with expected content', async ({ page, context }) => {
	await authenticate(page, context);
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const trigger = page.getByTestId('debug-open-modal');
	await expect(trigger).toBeVisible();
	await trigger.click();

	// The backdrop must appear first, then check for dialog inside it
	await expect(page.locator('.backdrop')).toBeVisible();
	const dialog = page.locator('[role="dialog"]');
	await expect(dialog).toBeVisible();

	// Our debug modal content should be present
	await expect(dialog).toContainText('Debug Modal');
});

test('modal: clicking the backdrop closes the modal', async ({ page, context }) => {
	await authenticate(page, context);
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const trigger = page.getByTestId('debug-open-modal');
	await expect(trigger).toBeVisible();
	await trigger.click();
	await expect(page.locator('.backdrop')).toBeVisible();

	// Click outside the dialog (on the backdrop itself)
	await page.locator('.backdrop').click({ position: { x: 5, y: 5 } });
	await expect(page.locator('.backdrop')).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Step 3B: Loading Spinner
// ---------------------------------------------------------------------------
test('loading: LoadingSpinner is visible in the DOM on the dashboard', async ({
	page,
	context
}) => {
	await authenticate(page, context);
	await page.goto('/');

	// The dashboard already renders a <LoadingSpinner /> in the widgets placeholder
	const spinner = page.locator('.spinner');
	await expect(spinner).toBeVisible();
});

test('loading: LoadingSpinner has the spin CSS animation', async ({ page, context }) => {
	await authenticate(page, context);
	await page.goto('/');

	const animationName = await page.locator('.spinner').evaluate((el) => {
		return getComputedStyle(el).animationName;
	});

	// The spinner uses a @keyframes named 'spin'
	expect(animationName).toContain('spin');
});

// ---------------------------------------------------------------------------
// Step 3C: SkeletonLoader (toggled via debug button)
// ---------------------------------------------------------------------------
test('loading: clicking the debug skeleton trigger shows a skeleton element', async ({
	page,
	context
}) => {
	await authenticate(page, context);
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const trigger = page.getByTestId('debug-show-skeleton');
	await expect(trigger).toBeVisible();
	await trigger.click();

	const skeleton = page.locator('.skeleton');
	await expect(skeleton).toBeVisible();
});

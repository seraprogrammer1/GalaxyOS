/**
 * Phase 4.5 — Goals Polish E2E spec
 *
 * Covers three assertions that must all pass in a real browser against the
 * running dev server:
 *
 *   Action 1 — Edit modal pre-fills existing goal data (title field shows
 *               "Original Title") and saves correctly when changed.
 *
 *   Action 2 — Delete shows the ConfirmModal. Checking "Don't ask me again"
 *               and confirming removes the goal AND persists auto_delete=true.
 *
 *   Action 3 — A subsequent delete (new goal created via UI) skips the modal
 *               entirely because auto_delete is now true — proving the setting
 *               was saved and honoured.
 *
 * Tests are serial: they share MongoDB state and each test depends on the
 * previous one having completed successfully.
 */
import { test, expect } from '@playwright/test';
import {
	seedTestUsers,
	clearTestDB,
	seedGoalForUser,
	upsertUserSettingsForUser
} from './utils/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function loginAsTestUser(
	page: import('@playwright/test').Page,
	context: import('@playwright/test').BrowserContext
): Promise<void> {
	// Block auto-login so we exercise the credential form.
	// The cookie disables isLocal on the server side; the route blocks the
	// browser-side auto fetch as a belt-and-suspenders measure.
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

// ---------------------------------------------------------------------------
// Suite — serial so tests build on each other's DB state
// ---------------------------------------------------------------------------
test.describe.serial('Goals Polish Flow', () => {
	test.beforeAll(async () => {
		// Seed fresh DB: users + one goal + settings with auto_delete=false
		await seedTestUsers();
		await upsertUserSettingsForUser('testuser', { auto_delete: false });
		await seedGoalForUser('testuser', {
			title: 'Original Title',
			category: 'Testing',
			target_value: 5
		});
	});

	test.afterAll(async () => {
		await clearTestDB();
	});

	// -----------------------------------------------------------------------
	// Action 1 — Edit modal pre-fills with existing goal data
	// -----------------------------------------------------------------------
	test('Action 1: edit modal pre-fills with existing data and saves', async ({ page, context }) => {
		await loginAsTestUser(page, context);

		// Wait for the goals list to appear (goals are loaded async on mount)
		await expect(page.locator('[data-testid="goals-list"]')).toBeVisible({ timeout: 10000 });

		// Find the seeded goal by its title text
		const goalItem = page
			.locator('[data-testid="goal-item"]')
			.filter({ hasText: 'Original Title' });
		await expect(goalItem).toBeVisible({ timeout: 10000 });

		// Open the edit modal
		await goalItem.getByRole('button', { name: /edit/i }).click();

		const modal = page.locator('[data-testid="goal-modal"]');
		await expect(modal).toBeVisible();

		// Assert the title input is pre-filled with the original value
		const titleInput = modal.getByTestId('goal-title-input');
		await expect(titleInput).toHaveValue('Original Title');

		// Update the title and save
		await titleInput.fill('Updated Title');
		await modal.getByRole('button', { name: /save|update/i }).click();

		// Modal closes; list shows the new title
		await expect(modal).not.toBeVisible();
		await expect(page.locator('[data-testid="goals-list"]')).toContainText('Updated Title');
	});

	// -----------------------------------------------------------------------
	// Action 2 — Delete shows ConfirmModal; "Don't ask me again" persists
	// -----------------------------------------------------------------------
	test('Action 2: delete shows ConfirmModal and dont-ask-again saves setting', async ({
		page,
		context
	}) => {
		await loginAsTestUser(page, context);

		// Wait for goals list to load
		await expect(page.locator('[data-testid="goals-list"]')).toBeVisible({ timeout: 10000 });

		// The goal is now titled "Updated Title" (from Action 1)
		const goalItem = page
			.locator('[data-testid="goal-item"]')
			.filter({ hasText: 'Updated Title' });
		await expect(goalItem).toBeVisible();

		// Click Delete
		await goalItem.getByRole('button', { name: /delete/i }).click();

		// ConfirmModal must appear
		const confirmModal = page.locator('[data-testid="confirm-modal"]');
		await expect(confirmModal).toBeVisible();

		// Check "Don't ask me again"
		await confirmModal.getByTestId('dont-ask-again-checkbox').check();

		// Confirm the deletion
		await confirmModal.getByTestId('confirm-btn').click();

		// Goal removed from the list (list may disappear entirely if it was the only goal)
		await expect(
			page.locator('[data-testid="goal-item"]').filter({ hasText: 'Updated Title' })
		).not.toBeVisible();

		// ConfirmModal is gone
		await expect(confirmModal).not.toBeVisible();
	});

	// -----------------------------------------------------------------------
	// Action 3 — Auto-delete bypasses ConfirmModal (setting was persisted)
	// -----------------------------------------------------------------------
	test('Action 3: subsequent delete skips ConfirmModal (auto_delete honoured)', async ({
		page,
		context
	}) => {
		await loginAsTestUser(page, context);

		// Wait for the widget to finish loading (settings & goals fetched)
		const widget = page.locator('[data-testid="goals-widget"]');
		await expect(widget).toBeVisible({ timeout: 10000 });
		await expect(widget.locator('text=Loading goals')).not.toBeVisible({ timeout: 10000 });

		// Create a fresh goal through the UI
		await page.locator('[data-testid="add-goal-btn"]').click();
		const addModal = page.locator('[data-testid="goal-modal"]');
		await expect(addModal).toBeVisible();

		await addModal.getByTestId('goal-title-input').fill('Quick Delete Test');
		await addModal.getByRole('button', { name: /save|create/i }).click();
		await expect(addModal).not.toBeVisible();

		// Verify the new goal exists
		const newGoal = page
			.locator('[data-testid="goal-item"]')
			.filter({ hasText: 'Quick Delete Test' });
		await expect(newGoal).toBeVisible();

		// Click Delete — auto_delete is true so no modal should appear
		await newGoal.getByRole('button', { name: 'Delete Quick Delete Test' }).click();

		// ConfirmModal must NOT appear
		await expect(page.locator('[data-testid="confirm-modal"]')).not.toBeVisible();

		// Goal must be gone
		await expect(
			page.locator('[data-testid="goal-item"]').filter({ hasText: 'Quick Delete Test' })
		).not.toBeVisible();
	});
});

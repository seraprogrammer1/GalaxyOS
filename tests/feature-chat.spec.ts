import { test, expect } from '@playwright/test';
import { clearTestDB, seedTestUsers } from './utils/db';

async function loginAsTestUser(
	page: import('@playwright/test').Page,
	context: import('@playwright/test').BrowserContext
): Promise<void> {
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

test.beforeAll(async () => {
	await seedTestUsers();
});

test.afterAll(async () => {
	await clearTestDB();
});

test('chat loop: user message, typing state, assistant response', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await page.route('**/api/chats', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
			return;
		}

		if (route.request().method() === 'POST') {
			await route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({ _id: 'chat-test-1', title: 'New Chat', owner: 'u1', messages: [] })
			});
			return;
		}

		await route.continue();
	});

	await page.route('**/api/chats/chat-test-1/message', async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 250));
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ message: 'Mock AI response: Hello AI' })
		});
	});

	await page.goto('/chat');
	await expect(page.locator('[data-testid="chat-page"]')).toBeVisible();

	const input = page.locator('[data-testid="chat-input-textarea"]');
	await expect(input).toBeEnabled();
	await input.fill('Hello AI');
	await page.locator('[data-testid="chat-input-send"]').click();

	await expect(page.locator('[data-testid="message-bubble-user"]').last()).toContainText('Hello AI');
	await expect(page.locator('[data-testid="chat-typing"]')).toBeVisible();
	await expect(page.locator('[data-testid="message-bubble-assistant"]').last()).toContainText(
		'Mock AI response: Hello AI'
	);
});

test('send failure shows error banner, not an assistant bubble', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await page.route('**/api/chats', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
			return;
		}
		if (route.request().method() === 'POST') {
			await route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({ _id: 'chat-err-1', title: 'New Chat', owner: 'u1', messages: [] })
			});
			return;
		}
		await route.continue();
	});

	await page.route('**/api/chats/chat-err-1/message', async (route) => {
		await route.fulfill({ status: 500 });
	});

	await page.goto('/chat');
	const input = page.locator('[data-testid="chat-input-textarea"]');
	await input.fill('Will this fail?');
	await page.locator('[data-testid="chat-input-send"]').click();

	// Error banner should appear
	await expect(page.locator('[data-testid="chat-error"]')).toBeVisible();
	// No assistant bubble should have been added
	await expect(page.locator('[data-testid="message-bubble-assistant"]')).toHaveCount(0);
	// User message should still be the last message → retry button enabled
	const retryBtn = page.locator('[data-testid="chat-input-send"]');
	await expect(retryBtn).toBeEnabled();
	await expect(retryBtn).toContainText('Retry');
});

test('retry does not duplicate the user message', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await page.route('**/api/chats', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
			return;
		}
		if (route.request().method() === 'POST') {
			await route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({ _id: 'chat-retry-1', title: 'New Chat', owner: 'u1', messages: [] })
			});
			return;
		}
		await route.continue();
	});

	let callCount = 0;
	await page.route('**/api/chats/chat-retry-1/message', async (route) => {
		callCount++;
		if (callCount === 1) {
			await route.fulfill({ status: 500 });
		} else {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ message: 'Retry worked' })
			});
		}
	});

	await page.goto('/chat');
	const input = page.locator('[data-testid="chat-input-textarea"]');
	await input.fill('Retry me');
	await page.locator('[data-testid="chat-input-send"]').click();

	// Wait for error state
	await expect(page.locator('[data-testid="chat-error"]')).toBeVisible();

	// Press retry (textarea is empty)
	await page.locator('[data-testid="chat-input-send"]').click();

	// Only one user bubble should exist (no duplicate)
	await expect(page.locator('[data-testid="message-bubble-user"]')).toHaveCount(1);
	await expect(page.locator('[data-testid="message-bubble-user"]').first()).toContainText('Retry me');
	await expect(page.locator('[data-testid="message-bubble-assistant"]').last()).toContainText('Retry worked');
});

test('retry button is absent when last message is from assistant', async ({ page, context }) => {
	await loginAsTestUser(page, context);

	await page.route('**/api/chats', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
			return;
		}
		if (route.request().method() === 'POST') {
			await route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({ _id: 'chat-noretry-1', title: 'New Chat', owner: 'u1', messages: [] })
			});
			return;
		}
		await route.continue();
	});

	await page.route('**/api/chats/chat-noretry-1/message', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ message: 'All good' })
		});
	});

	await page.goto('/chat');
	const input = page.locator('[data-testid="chat-input-textarea"]');
	await input.fill('Hello');
	await page.locator('[data-testid="chat-input-send"]').click();

	// Wait for assistant response
	await expect(page.locator('[data-testid="message-bubble-assistant"]').last()).toContainText('All good');

	// Send button should show "Send" not "Retry", and be disabled (empty textarea)
	const sendBtn = page.locator('[data-testid="chat-input-send"]');
	await expect(sendBtn).toContainText('Send');
	await expect(sendBtn).toBeDisabled();
});

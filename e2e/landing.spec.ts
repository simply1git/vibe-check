import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/VibeCheck/);
});

test('can navigate to create group tab', async ({ page }) => {
  await page.goto('/');
  // Assuming "Create Group" is the default or accessible text
  await expect(page.getByText('Create a Squad')).toBeVisible(); 
});

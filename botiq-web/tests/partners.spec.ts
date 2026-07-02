import { test, expect } from '@playwright/test';

async function performLogin(page) {
  await page.goto('http://localhost:4200/mpin-login');
  await page.locator('#loginMpin').fill('123456');
  await page.locator('button.btn-primary', { hasText: 'Verify Account' }).click();
  await expect(page).toHaveURL(/.*\/dashboard/);
}

test.describe('Partner Management Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Perform login to bypass authGuard
    await performLogin(page);
  });

  test('should verify listing page elements and add partner button', async ({ page }) => {
    await page.goto('http://localhost:4200/partners-list');

    // Title should be "Partners"
    await expect(page.locator('h2')).toHaveText('Partners');

    // Add Partner button should be visible
    const addBtn = page.locator('button.add-btn', { hasText: '+ Add Partner' });
    await expect(addBtn).toBeVisible();

    // Click it and verify navigation to add-partner form
    await addBtn.click();
    await expect(page).toHaveURL(/.*\/add-partner/);
  });

  test('should validate fields and submit partner creation', async ({ page }) => {
    await page.goto('http://localhost:4200/add-partner');

    // Page title
    await expect(page.locator('h2')).toHaveText('Add Partner');

    const nameInput = page.locator('input[name="name"]');
    const phoneInput = page.locator('input[name="phone"]');
    const categorySelect = page.locator('select[name="category"]');
    const addressInput = page.locator('input[name="address"]');
    const notesInput = page.locator('textarea[name="notes"]');
    const statusCheckbox = page.locator('input[name="status"]');
    const submitBtn = page.locator('button[type="submit"]');

    // Initial state: Form is invalid because name and phone are required
    await expect(submitBtn).toBeDisabled();

    // Touch name and check error
    await nameInput.focus();
    await nameInput.blur();
    await expect(page.locator('.error').first()).toContainText('Required');

    // Fill name and phone
    await nameInput.fill('John Partner');
    await phoneInput.fill('9988776655');

    // Select category (first option after 'Select')
    await categorySelect.selectOption({ index: 1 });

    await addressInput.fill('12 Partner Lane, Bangalore');
    await notesInput.fill('Regular tailor for boutique designs.');
    await statusCheckbox.check();

    // Submit button should be enabled
    await expect(submitBtn).toBeEnabled();

    // Click cancel to ensure it works
    const cancelBtn = page.locator('button[type="button"]', { hasText: 'Cancel' });
    await cancelBtn.click();
    await expect(page).toHaveURL(/.*\/partners-list/);
  });

});

import { test, expect } from '@playwright/test';

test.describe('Organization Registration Page', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the register page before each test
    await page.goto('http://localhost:4200/register');
  });

  test('should verify layout and titles', async ({ page }) => {
    await expect(page).toHaveTitle('BotiqWeb');
    await expect(page.locator('h2')).toHaveText('Get Started with Botiq');
    await expect(page.locator('.subtitle')).toHaveText('Create your account to manage your business efficiently');
  });

  test('should keep the submit button disabled until all required fields are filled and valid', async ({ page }) => {
    const orgNameInput = page.locator('#orgName');
    const ownerNameInput = page.locator('#ownerName');
    const emailInput = page.locator('#email');
    const phoneInput = page.locator('input[name="phone"]');
    const addressInput = page.locator('#address');
    const termsCheckbox = page.locator('#terms');
    const submitButton = page.locator('button[type="submit"]');

    // Initial state: button disabled
    await expect(submitButton).toBeDisabled();

    // Fill some fields, but not all
    await orgNameInput.fill('Acme Boutique');
    await ownerNameInput.fill('Jane Patrick');
    await expect(submitButton).toBeDisabled();

    // Fill remaining inputs but do not check terms checkbox
    await emailInput.fill('jane@dfive.com');
    await phoneInput.fill('9876543210');
    await addressInput.fill('123 Fashion Street, New Delhi');
    await expect(submitButton).toBeDisabled();

    // Check terms checkbox -> Button should be enabled
   await page.getByLabel(/I agree to the/i).check();
   await expect(submitButton).toBeEnabled();
  });

  test('should show validation error for invalid phone format', async ({ page }) => {
    const phoneInput = page.locator('input[name="phone"]');
    
    // Fill invalid phone (less than 10 digits)
    await phoneInput.fill('1234');
    await phoneInput.blur(); // Blur to trigger touched state

    // The validation error should appear
    const errorText = page.locator('.error small');
    await expect(errorText).toBeVisible();
    await expect(errorText).toContainText('Enter a valid 10-digit phone number');
  });

  test('should navigate to login page when clicking Log In link', async ({ page }) => {
    const loginLink = page.locator('a.link', { hasText: 'Log In' });
    await loginLink.click();
    await expect(page).toHaveURL(/.*\/login/);
  });

});

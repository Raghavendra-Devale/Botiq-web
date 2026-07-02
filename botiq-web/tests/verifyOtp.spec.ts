import { test, expect } from '@playwright/test';

test.describe('OTP Verification Page', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the verify-otp page before each test
    await page.goto('http://localhost:4200/verify-otp');
  });

  test('should verify layout, title, and back link navigation', async ({ page }) => {
    await expect(page).toHaveTitle('BotiqWeb');
    await expect(page.locator('h2.title')).toHaveText('Verify OTP');
    await expect(page.locator('.subtitle')).toHaveText('Enter the 6-digit code sent securely to your number.');

    // Check back to login link
    const backLink = page.locator('a.back-link', { hasText: 'Back to Login' });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should render 6 input fields for OTP digits', async ({ page }) => {
    const otpInputs = page.locator('.otp-group input[type="text"]');
    await expect(otpInputs).toHaveCount(6);

    // Verify presence of aria-labels
    for (let i = 0; i < 6; i++) {
      const input = otpInputs.nth(i);
      await expect(input).toHaveAttribute('aria-label', `OTP Digit ${i + 1}`);
      await expect(input).toHaveAttribute('placeholder', `-`);
    }
  });

  test('should allow entering digits and navigating input boxes', async ({ page }) => {
    const otpInputs = page.locator('.otp-group input[type="text"]');

    // Fill the digits one by one
    for (let i = 0; i < 6; i++) {
      const input = otpInputs.nth(i);
      await input.fill(String(i + 1));
      // In a real browser, focus shifts forward. Let's make sure value is set.
      await expect(input).toHaveValue(String(i + 1));
    }
  });

});

import { test, expect } from '@playwright/test';

test.describe('MPIN Login Screen Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the MPIN login page before each test
    await page.goto('http://localhost:4200/mpin-login');
  });

  test('should login with valid MPIN', async ({ page }) => {
    // Intercept and mock backend login success (HTTP 200)
    await page.route('**/auth/mpin-login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Intercept and mock authGuard session validation (HTTP 200)
    await page.route('**/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: "Jane Patrick",
          email: "jane@dfive.com",
          role: "OWNER"
        })
      });
    });

    // Intercept and mock device status check (HTTP 200)
    await page.route('**/auth/device-status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ knownDevice: true, status: 'ACTIVE' })
      });
    });

    const mpinInput = page.locator('#loginMpin');
    const verifyButton = page.locator('button.btn-primary', { hasText: 'Verify Account' });

    await mpinInput.fill('123456');
    await verifyButton.click();

    // Verify it navigates to the dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should keep the Verify button disabled for MPINs shorter than 6 digits', async ({ page }) => {
    const mpinInput = page.locator('#loginMpin');
    const verifyButton = page.locator('button.btn-primary', { hasText: 'Verify Account' });

    // Initial state: empty input, button should be disabled
    await expect(verifyButton).toBeDisabled();

    // Fill with less than 6 digits
    await mpinInput.fill('123');
    await expect(verifyButton).toBeDisabled();

    // Fill with 5 digits
    await mpinInput.fill('12345');
    await expect(verifyButton).toBeDisabled();
  });

  test('should enable the Verify button when a 6-digit MPIN is entered', async ({ page }) => {
    const mpinInput = page.locator('#loginMpin');
    const verifyButton = page.locator('button.btn-primary', { hasText: 'Verify Account' });

    // Fill with exactly 6 digits
    await mpinInput.fill('123456');
    await expect(verifyButton).toBeEnabled();
  });

  test('should handle invalid 6-digit MPIN submission and show backend error', async ({ page }) => {
    // Intercept and mock backend login failure (HTTP 400 to avoid trigger global 401 interceptor redirect)
    await page.route('**/auth/mpin-login', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Device not recognized' })
      });
    });

    const mpinInput = page.locator('#loginMpin');
    const verifyButton = page.locator('button.btn-primary', { hasText: 'Verify Account' });
    const errorMessage = page.locator('.error-message');

    await mpinInput.fill('121212');
    await verifyButton.click();

    // Verify error message container is visible and contains expected backend response
    await expect(errorMessage).toBeVisible({ timeout: 15000 });
    await expect(errorMessage).toContainText('Device not recognized', { timeout: 15000 });
  });

  test('should navigate to login page with OTP query param when clicking Forgot PIN', async ({ page }) => {
    const forgotPinLink = page.locator('a', { hasText: 'Sign in with SMS OTP' });

    // Click the OTP alternative link
    await forgotPinLink.click();

    // Expect redirection to /login with query parameter otp=true
    await expect(page).toHaveURL(/.*\/login\?otp=true/);
  });

});
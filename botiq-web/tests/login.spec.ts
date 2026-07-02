import { test, expect } from '@playwright/test';

test.describe('Phone Number Login Page', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the login page before each test
    await page.goto('http://localhost:4200/login');
  });

  test('should verify page layout and title', async ({ page }) => {
    await expect(page).toHaveTitle('BotiqWeb');
    await expect(page.locator('h2.title')).toHaveText('Welcome Back');
    await expect(page.locator('.subtitle')).toHaveText('Login using your phone number to continue');
  });

  test('should keep the Send OTP button disabled for phone numbers shorter than 10 digits', async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"]');
    const sendOtpButton = page.locator('button.btn-primary', { hasText: 'Send OTP' });

    // Initial state: empty phone number
    await expect(sendOtpButton).toBeDisabled();

    // Fill with 5 digits
    await phoneInput.fill('98765');
    await expect(sendOtpButton).toBeDisabled();

    // Fill with 9 digits
    await phoneInput.fill('987654321');
    await expect(sendOtpButton).toBeDisabled();
  });

  test('should enable the Send OTP button when a 10-digit phone number is entered', async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"]');
    const sendOtpButton = page.locator('button.btn-primary', { hasText: 'Send OTP' });

    // Fill with exactly 10 digits
    await phoneInput.fill('9876543210');
    await expect(sendOtpButton).toBeEnabled();
  });

  test('should navigate to the registration page when clicking Create an Account', async ({ page }) => {
    const registerLink = page.locator('span', { hasText: 'Create an account' });

    await registerLink.click();

    // Verify it navigates to /register
    await expect(page).toHaveURL(/.*\/register/);
  });

});

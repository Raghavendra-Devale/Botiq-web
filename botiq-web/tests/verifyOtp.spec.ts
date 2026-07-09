import { test, expect, Page, Locator } from '@playwright/test';

class VerifyOtpPage {
  readonly page: Page;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly backToLoginLink: Locator;
  readonly otpInputs: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h2.title');
    this.subtitle = page.locator('.subtitle');
    this.backToLoginLink = page.locator('a.back-link', { hasText: 'Back to Login' });
    this.otpInputs = page.locator('.otp-group input[type="text"]');
    this.verifyButton = page.locator('button.btn-primary', { hasText: 'Verify Account' });
  }

  async navigate() {
    await this.page.goto('http://localhost:4200/login');
    await this.page.getByPlaceholder('Enter phone number').fill('9998887770');
    await this.page.getByRole('button', { name: 'Send OTP' }).click();

    // Confirm device conflict modal if it appears
    const confirmBtn = this.page.locator('button.btn-confirm-modal', { hasText: 'Confirm' });
    try {
      await confirmBtn.waitFor({ state: 'visible', timeout: 2000 });
      await confirmBtn.click();
    } catch (e) {}

    // Wait for the OTP input fields to load on the verify-otp page
    await this.otpInputs.first().waitFor({ state: 'visible' });
  }

  async clickBackToLogin() {
    await this.backToLoginLink.click();
  }

  async enterOtp(otp: string) {
    await this.otpInputs.first().focus();
    await this.page.keyboard.type(otp, { delay: 100 });
  }
}

test.describe('OTP Verification Page', () => {
  let verifyOtpPage: VerifyOtpPage;

  test.beforeEach(async ({ page }) => {
    verifyOtpPage = new VerifyOtpPage(page);
    await verifyOtpPage.navigate();
  });

  test('should verify layout, title, and back link navigation', async () => {
    await expect(verifyOtpPage.page).toHaveTitle('BotiqWeb');
    await expect(verifyOtpPage.title).toHaveText('Verify OTP');
    await expect(verifyOtpPage.subtitle).toHaveText('Enter the 6-digit code sent securely to your number.');

    await expect(verifyOtpPage.backToLoginLink).toBeVisible();
    await verifyOtpPage.clickBackToLogin();
    await expect(verifyOtpPage.page).toHaveURL(/.*\/login/);
  });

  test('should render 6 input fields for OTP digits', async () => {
    await expect(verifyOtpPage.otpInputs).toHaveCount(6);

    for (let i = 0; i < 6; i++) {
      const input = verifyOtpPage.otpInputs.nth(i);
      await expect(input).toHaveAttribute('aria-label', `OTP Digit ${i + 1}`);
      await expect(input).toHaveAttribute('placeholder', `-`);
    }
  });

  test('should allow entering digits and navigating input boxes', async () => {
    // Fill the digits one by one using typing sequence to naturally trigger focus shifts
    const firstInput = verifyOtpPage.otpInputs.first();
    await firstInput.focus();
    await verifyOtpPage.page.keyboard.type('123456', { delay: 100 });

    for (let i = 0; i < 6; i++) {
      const input = verifyOtpPage.otpInputs.nth(i);
      await expect(input).toHaveValue(String(i + 1));
    }
  });
});

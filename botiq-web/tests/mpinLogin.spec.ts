import { test, expect, Page, Locator } from '@playwright/test';

class MpinLoginPage {
  readonly page: Page;
  readonly mpinInput: Locator;
  readonly verifyButton: Locator;
  readonly errorMessage: Locator;
  readonly smsOtpLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mpinInput = page.locator('#loginMpin');
    this.verifyButton = page.locator('button.btn-primary', { hasText: 'Verify Account' });
    this.errorMessage = page.locator('.error-message');
    this.smsOtpLink = page.locator('a', { hasText: 'Sign in with SMS OTP' });
  }

  async navigate() {
    await this.page.goto('http://localhost:4200/mpin-login');
  }

  async fillMpin(mpin: string) {
    await this.mpinInput.fill(mpin);
  }

  async clickVerify() {
    await this.verifyButton.click();
  }

  async clickSmsOtp() {
    await this.smsOtpLink.click();
  }
}

test.describe('MPIN Login Screen Flow', () => {
  let mpinLoginPage: MpinLoginPage;

  test.beforeEach(async ({ page }) => {
    mpinLoginPage = new MpinLoginPage(page);
    await mpinLoginPage.navigate();
  });

  test('should login with valid MPIN', async ({ page }) => {
    await page.route('**/auth/mpin-login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

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

    await page.route('**/auth/device-status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ knownDevice: true, status: 'ACTIVE' })
      });
    });

    await mpinLoginPage.fillMpin('123456');
    await mpinLoginPage.clickVerify();

    await expect(mpinLoginPage.page).toHaveURL(/.*\/dashboard/);
  });

  test('should keep the Verify button disabled for MPINs shorter than 6 digits', async () => {
    await expect(mpinLoginPage.verifyButton).toBeDisabled();

    await mpinLoginPage.fillMpin('123');
    await expect(mpinLoginPage.verifyButton).toBeDisabled();

    await mpinLoginPage.fillMpin('12345');
    await expect(mpinLoginPage.verifyButton).toBeDisabled();
  });

  test('should enable the Verify button when a 6-digit MPIN is entered', async () => {
    await mpinLoginPage.fillMpin('123456');
    await expect(mpinLoginPage.verifyButton).toBeEnabled();
  });

  test('should handle invalid 6-digit MPIN submission and show backend error', async ({ page }) => {
    await page.route('**/auth/mpin-login', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Device not recognized' })
      });
    });

    await mpinLoginPage.fillMpin('121212');
    await mpinLoginPage.clickVerify();

    await expect(mpinLoginPage.errorMessage).toBeVisible({ timeout: 15000 });
    await expect(mpinLoginPage.errorMessage).toContainText('Device not recognized', { timeout: 15000 });
  });

  test('should navigate to login page with OTP query param when clicking Forgot PIN', async () => {
    await mpinLoginPage.clickSmsOtp();
    await expect(mpinLoginPage.page).toHaveURL(/.*\/login\?otp=true/);
  });
});
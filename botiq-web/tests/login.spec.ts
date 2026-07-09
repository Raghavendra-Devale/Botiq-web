import { test, expect, Page, Locator } from '@playwright/test';

class LoginPage {
  readonly page: Page;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly phoneInput: Locator;
  readonly sendOtpButton: Locator;
  readonly createAccountLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h2.title');
    this.subtitle = page.locator('.subtitle');
    this.phoneInput = page.locator('input[type="tel"]');
    this.sendOtpButton = page.locator('button.btn-primary', { hasText: 'Send OTP' });
    this.createAccountLink = page.locator('span', { hasText: 'Create an account' });
  }

  async navigate() {
    await this.page.goto('http://localhost:4200/login');
  }

  async fillPhone(phone: string) {
    await this.phoneInput.fill(phone);
  }

  async clickCreateAccount() {
    await this.createAccountLink.click();
  }
}

test.describe('Phone Number Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test('should verify page layout and title', async () => {
    await expect(loginPage.page).toHaveTitle('BotiqWeb');
    await expect(loginPage.title).toHaveText('Welcome Back');
    await expect(loginPage.subtitle).toHaveText('Login using your phone number to continue');
  });

  test('should keep the Send OTP button disabled for phone numbers shorter than 10 digits', async () => {
    await expect(loginPage.sendOtpButton).toBeDisabled();

    await loginPage.fillPhone('98765');
    await expect(loginPage.sendOtpButton).toBeDisabled();

    await loginPage.fillPhone('987654321');
    await expect(loginPage.sendOtpButton).toBeDisabled();
  });

  test('should enable the Send OTP button when a 10-digit phone number is entered', async () => {
    await loginPage.fillPhone('9876543210');
    await expect(loginPage.sendOtpButton).toBeEnabled();
  });

  test('should navigate to the registration page when clicking Create an Account', async () => {
    await loginPage.clickCreateAccount();
    await expect(loginPage.page).toHaveURL(/.*\/register/);
  });
});

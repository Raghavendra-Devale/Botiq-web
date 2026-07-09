import { test, expect, Page, Locator } from '@playwright/test';

class RegisterPage {
  readonly page: Page;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly orgNameInput: Locator;
  readonly ownerNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly addressInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly phoneErrorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h2');
    this.subtitle = page.locator('.subtitle');
    this.orgNameInput = page.locator('#orgName');
    this.ownerNameInput = page.locator('#ownerName');
    this.emailInput = page.locator('#email');
    this.phoneInput = page.locator('input[name="phone"]');
    this.addressInput = page.locator('#address');
    this.termsCheckbox = page.getByLabel(/I agree to the/i);
    this.submitButton = page.locator('button[type="submit"]');
    this.loginLink = page.locator('a.link', { hasText: 'Log In' });
    this.phoneErrorMessage = page.locator('.error small');
  }

  async navigate() {
    await this.page.goto('http://localhost:4200/register');
  }

  async fillForm(data: {
    orgName?: string;
    ownerName?: string;
    email?: string;
    phone?: string;
    address?: string;
    agreeTerms?: boolean;
  }) {
    if (data.orgName !== undefined) await this.orgNameInput.fill(data.orgName);
    if (data.ownerName !== undefined) await this.ownerNameInput.fill(data.ownerName);
    if (data.email !== undefined) await this.emailInput.fill(data.email);
    if (data.phone !== undefined) await this.phoneInput.fill(data.phone);
    if (data.address !== undefined) await this.addressInput.fill(data.address);
    if (data.agreeTerms !== undefined) {
      if (data.agreeTerms) {
        await this.termsCheckbox.check();
      } else {
        await this.termsCheckbox.uncheck();
      }
    }
  }

  async clickLogin() {
    await this.loginLink.click();
  }
}

test.describe('Organization Registration Page', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.navigate();
  });

  test('should verify layout and titles', async () => {
    await expect(registerPage.page).toHaveTitle('BotiqWeb');
    await expect(registerPage.title).toHaveText('Get Started with Botiq');
    await expect(registerPage.subtitle).toHaveText('Create your account to manage your business efficiently');
  });

  test('should keep the submit button disabled until all required fields are filled and valid', async () => {
    await expect(registerPage.submitButton).toBeDisabled();

    await registerPage.fillForm({
      orgName: 'Acme Boutique',
      ownerName: 'Jane Patrick',
    });
    await expect(registerPage.submitButton).toBeDisabled();

    await registerPage.fillForm({
      email: 'jane@dfive.com',
      phone: '9876543210',
      address: '123 Fashion Street, New Delhi',
    });
    await expect(registerPage.submitButton).toBeDisabled();

    await registerPage.termsCheckbox.check();
    await expect(registerPage.submitButton).toBeEnabled();
  });

  test('should show validation error for invalid phone format', async () => {
    await registerPage.phoneInput.fill('1234');
    await registerPage.phoneInput.blur();

    await expect(registerPage.phoneErrorMessage).toBeVisible();
    await expect(registerPage.phoneErrorMessage).toContainText('Enter a valid 10-digit phone number');
  });

  test('should navigate to login page when clicking Log In link', async () => {
    await registerPage.clickLogin();
    await expect(registerPage.page).toHaveURL(/.*\/login/);
  });
});

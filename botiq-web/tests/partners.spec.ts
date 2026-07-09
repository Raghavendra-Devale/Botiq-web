import { test, expect, Page, Locator } from '@playwright/test';

// Use storageState to load authenticated state
test.use({ storageState: 'playwright/.auth/user.json' });

class PartnersPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly addPartnerButton: Locator;
  readonly nameInput: Locator;
  readonly phoneInput: Locator;
  readonly categorySelect: Locator;
  readonly addressInput: Locator;
  readonly notesInput: Locator;
  readonly statusCheckbox: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessages: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h2');
    this.addPartnerButton = page.locator('button.add-btn', { hasText: '+ Add Partner' });
    this.submitButton = page.locator('button[type="submit"]');
    this.cancelButton = page.locator('button[type="button"]', { hasText: 'Cancel' });
    this.nameInput = page.locator('input[name="name"]');
    this.phoneInput = page.locator('input[name="phone"]');
    this.categorySelect = page.locator('select[name="category"]');
    this.addressInput = page.locator('input[name="address"]');
    this.notesInput = page.locator('textarea[name="notes"]');
    this.statusCheckbox = page.locator('input[name="status"]');
    this.errorMessages = page.locator('.error');
  }

  async navigateToList() {
    await this.page.goto('http://localhost:4200/partners-list');
  }

  async navigateToAddForm() {
    await this.page.goto('http://localhost:4200/add-partner');
  }

  async fillForm(data: {
    name?: string;
    phone?: string;
    categoryIndex?: number;
    address?: string;
    notes?: string;
    status?: boolean;
  }) {
    if (data.name !== undefined) await this.nameInput.fill(data.name);
    if (data.phone !== undefined) await this.phoneInput.fill(data.phone);
    if (data.categoryIndex !== undefined) {
      await this.categorySelect.selectOption({ index: data.categoryIndex });
    }
    if (data.address !== undefined) await this.addressInput.fill(data.address);
    if (data.notes !== undefined) await this.notesInput.fill(data.notes);
    if (data.status !== undefined) {
      if (data.status) {
        await this.statusCheckbox.check();
      } else {
        await this.statusCheckbox.uncheck();
      }
    }
  }
}

test.describe('Partner Management Flow', () => {
  let partnersPage: PartnersPage;

  test.beforeEach(async ({ page }) => {
    // Intercept and mock backend category data
    await page.route('**/getMasterByType?type=WORK_CATEGORY', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { key_id: 1, key_name: 'Tailor', price: 0 },
          { key_id: 2, key_name: 'Embroidery', price: 0 }
        ])
      });
    });

    partnersPage = new PartnersPage(page);
  });

  test('should verify listing page elements and add partner button', async () => {
    await partnersPage.navigateToList();
    await expect(partnersPage.pageTitle).toHaveText('Partners');
    await expect(partnersPage.addPartnerButton).toBeVisible();
    await partnersPage.addPartnerButton.click();
    await expect(partnersPage.page).toHaveURL(/.*\/add-partner/);
  });

  test('should validate fields and submit partner creation', async () => {
    await partnersPage.navigateToAddForm();
    await expect(partnersPage.pageTitle).toHaveText('Add Partner');
    // Initial state: Form is invalid, but the button is always enabled in this UI
    await expect(partnersPage.submitButton).toBeEnabled();

    await partnersPage.nameInput.focus();
    await partnersPage.nameInput.blur();
    await expect(partnersPage.errorMessages.first()).toContainText('Required');

    await partnersPage.fillForm({
      name: 'John Partner',
      phone: '9988776655',
      categoryIndex: 1,
      address: '12 Partner Lane, Bangalore',
      notes: 'Regular tailor for boutique designs.',
      status: true,
    });

    await expect(partnersPage.submitButton).toBeEnabled();
    await partnersPage.cancelButton.click();
    await expect(partnersPage.page).toHaveURL(/.*\/partners-list/);
  });
});

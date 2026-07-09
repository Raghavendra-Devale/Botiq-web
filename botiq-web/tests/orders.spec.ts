import { test, expect, Page, Locator } from '@playwright/test';

// Use storageState to load authenticated state
test.use({ storageState: 'playwright/.auth/user.json' });

class OrdersPage {
  readonly page: Page;
  readonly mainTitle: Locator;
  readonly searchCategoriesInput: Locator;
  readonly clearSearchButton: Locator;
  readonly cartEmptyState: Locator;
  readonly firstCategoryChip: Locator;
  readonly cartRows: Locator;
  readonly customItemNameInput: Locator;
  readonly customItemPriceInput: Locator;
  readonly addCustomButton: Locator;
  readonly subtotalText: Locator;
  readonly advanceInput: Locator;
  readonly balanceDueText: Locator;
  readonly attachmentsTitle: Locator;
  readonly measurementsUploadLabel: Locator;
  readonly assetCountBadge: Locator;
  readonly viewAttachmentsButton: Locator;
  readonly modalContent: Locator;
  readonly modalGroupTitle: Locator;
  readonly modalThumbnailImage: Locator;
  readonly closeModalButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainTitle = page.locator('.pos-main-title');
    this.searchCategoriesInput = page.locator('input[placeholder*="Search categories"]');
    this.clearSearchButton = page.locator('button.clear-search-btn');
    this.cartEmptyState = page.locator('.cart-empty-state');
    this.firstCategoryChip = page.locator('.catalog-chip');
    this.cartRows = page.locator('.cart-compact-row');
    
    this.customItemNameInput = page.locator('input[placeholder*="Item name"]');
    this.customItemPriceInput = page.locator('input[placeholder="Price"]');
    this.addCustomButton = page.locator('button.add-custom-btn');
    
    this.subtotalText = page.locator('.billing-val');
    this.advanceInput = page.locator('input.advance-input');
    this.balanceDueText = page.locator('.balance-value');
    
    this.attachmentsTitle = page.locator('.attachments-strip .panel-card-title');
    this.measurementsUploadLabel = page.locator('label[for="measurements-pos"]');
    this.assetCountBadge = page.locator('label[for="measurements-pos"] .asset-count-badge');
    this.viewAttachmentsButton = page.locator('button.pos-view-attachments-btn');
    this.modalContent = page.locator('.attachments-modal .modal-content');
    this.modalGroupTitle = page.locator('.attachments-modal .modal-content .group-title');
    this.modalThumbnailImage = page.locator('.attachments-modal .modal-content .modal-thumb-item img');
    this.closeModalButton = page.locator('.attachments-modal .modal-content .close-modal-btn');
  }

  async navigate() {
    await this.page.goto('http://localhost:4200/add-new-order/tab1');
  }

  async searchCategories(query: string) {
    await this.searchCategoriesInput.fill(query);
  }

  async clearSearch() {
    await this.clearSearchButton.click();
  }

  async addFirstCategoryToCart() {
    await this.firstCategoryChip.click();
  }

  async addCustomItem(name: string, price: string) {
    await this.customItemNameInput.fill(name);
    await this.customItemPriceInput.fill(price);
    await this.addCustomButton.click();
  }

  async enterAdvance(amount: string) {
    await this.advanceInput.fill(amount);
  }

  async openAttachmentsModal() {
    await this.viewAttachmentsButton.click();
  }

  async closeAttachmentsModal() {
    await this.closeModalButton.click();
  }
}

test.describe('POS Sales Order Page', () => {
  let ordersPage: OrdersPage;

  test.beforeEach(async ({ page }) => {
    // Intercept and mock backend master category data
    await page.route('**/getMasterByType?type=WORK_CATEGORY', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { key_id: 1, key_name: 'Blouse', price: 350 },
          { key_id: 2, key_name: 'Lehenga', price: 1200 },
          { key_id: 3, key_name: 'Kurta', price: 400 }
        ])
      });
    });

    // Intercept and mock backend master order status data
    await page.route('**/getMasterByType?type=ORDER_STATUS', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { key_id: 1, key_name: 'PENDING' },
          { key_id: 2, key_name: 'COMPLETED' }
        ])
      });
    });

    ordersPage = new OrdersPage(page);
    await ordersPage.navigate();
  });

  test('should display order page headers, search, and layout elements', async () => {
    await expect(ordersPage.mainTitle).toContainText('New Sales Order');
    await expect(ordersPage.searchCategoriesInput).toBeVisible();
    await expect(ordersPage.cartEmptyState).toBeVisible();
    await expect(ordersPage.cartEmptyState).toContainText('Select categories above to add items');
  });

  test('should filter categories via search input', async () => {
    await ordersPage.searchCategories('Blouse');
    await expect(ordersPage.clearSearchButton).toBeVisible();
    await ordersPage.clearSearch();
    await expect(ordersPage.clearSearchButton).not.toBeVisible();
  });



  test('should add custom items to the sales order cart', async () => {
    await ordersPage.addCustomItem('Designer Lehenga Hemming', '450');

    const cartRow = ordersPage.cartRows.filter({ hasText: 'Designer Lehenga Hemming' });
    await expect(cartRow).toBeVisible();

    await expect(ordersPage.subtotalText.first()).toContainText('₹450');
  });

  test('should calculate billing values including subtotal, advance, and balance due', async () => {
    await ordersPage.addCustomItem('Custom Dress', '1000');

    await expect(ordersPage.balanceDueText).toContainText('₹1000');

    await ordersPage.enterAdvance('400');
    
    await expect(ordersPage.balanceDueText).toContainText('₹600');
  });

  test('should upload files and display them in the attachments modal', async () => {
    await expect(ordersPage.attachmentsTitle).toBeVisible();
    await expect(ordersPage.attachmentsTitle).toContainText('Attachments');

    const fileChooserPromise = ordersPage.page.waitForEvent('filechooser');
    await ordersPage.measurementsUploadLabel.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test-measurement.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-content')
    });

    await expect(ordersPage.assetCountBadge).toBeVisible();
    await expect(ordersPage.assetCountBadge).toContainText('1');

    await expect(ordersPage.viewAttachmentsButton).toBeVisible();
    await expect(ordersPage.viewAttachmentsButton).toContainText('View / Manage (1)');

    await ordersPage.openAttachmentsModal();

    await expect(ordersPage.modalContent).toBeVisible();
    await expect(ordersPage.modalGroupTitle).toContainText('Measurements');
    await expect(ordersPage.modalThumbnailImage).toBeVisible();

    await ordersPage.closeAttachmentsModal();
    await expect(ordersPage.modalContent).not.toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

async function performLogin(page) {
  await page.goto('http://localhost:4200/mpin-login');
  await page.locator('#loginMpin').fill('123456');
  await page.locator('button.btn-primary', { hasText: 'Verify Account' }).click();
  await expect(page).toHaveURL(/.*\/dashboard/);
}

test.describe('POS Sales Order Page', () => {

  test.beforeEach(async ({ page }) => {
    // Perform login to bypass authGuard
    await performLogin(page);
    await page.goto('http://localhost:4200/add-new-order/tab1');
  });

  test('should display order page headers, search, and layout elements', async ({ page }) => {
    // Verify title
    await expect(page.locator('.pos-main-title')).toContainText('New Sales Order');

    // Search bar is visible
    const searchBar = page.locator('input[placeholder*="Search categories"]');
    await expect(searchBar).toBeVisible();

    // Verify empty cart state message exists
    const cartEmpty = page.locator('.cart-empty-state');
    await expect(cartEmpty).toBeVisible();
    await expect(cartEmpty).toContainText('Select categories above to add items');
  });

  test('should filter categories via search input', async ({ page }) => {
    const searchBar = page.locator('input[placeholder*="Search categories"]');

    // Enter a search term
    await searchBar.fill('Blouse');

    // Check that chips are filtered (or show no results if none matching)
    // We verify the clear button is shown when search bar is filled
    const clearSearchBtn = page.locator('button.clear-search-btn');
    await expect(clearSearchBtn).toBeVisible();

    // Clear search and ensure clear button disappears
    await clearSearchBtn.click();
    await expect(clearSearchBtn).not.toBeVisible();
  });

  test('should add category chips to cart and perform quantity adjustments', async ({ page }) => {
    // Locate the first category chip and click to add to cart
    const firstChip = page.locator('.catalog-chip').first();
    await expect(firstChip).toBeVisible();
    await firstChip.click();

    // Cart list should now be visible (empty state should disappear)
    await expect(page.locator('.cart-empty-state')).not.toBeVisible();

    // Verify item quantity count in the chip badge and cart input
    const cartRow = page.locator('.cart-compact-row').first();
    await expect(cartRow).toBeVisible();

    const qtyInput = cartRow.locator('input.qty-input');
    await expect(qtyInput).toHaveValue('1');

    // Increment item quantity using the plus button
    const plusBtn = cartRow.locator('button.qty-btn').nth(1); // second button is increment
    await plusBtn.click();
    await expect(qtyInput).toHaveValue('2');

    // Decrement item quantity using the minus button
    const minusBtn = cartRow.locator('button.qty-btn').nth(0); // first button is decrement
    await minusBtn.click();
    await expect(qtyInput).toHaveValue('1');
  });

  test('should add custom items to the sales order cart', async ({ page }) => {
    const customItemNameInput = page.locator('input[placeholder*="Item name"]');
    const customItemPriceInput = page.locator('input[placeholder="Price"]');
    const addCustomBtn = page.locator('button.add-custom-btn');

    // Fill custom item info
    await customItemNameInput.fill('Designer Lehenga Hemming');
    await customItemPriceInput.fill('450');

    // Add it to the cart
    await addCustomBtn.click();

    // Verify it is listed in the cart
    const cartRow = page.locator('.cart-compact-row', { hasText: 'Designer Lehenga Hemming' });
    await expect(cartRow).toBeVisible();

    // Verify Subtotal updates
    const subtotalText = page.locator('.billing-val').first();
    await expect(subtotalText).toContainText('₹450');
  });

  test('should calculate billing values including subtotal, advance, and balance due', async ({ page }) => {
    // Add custom item
    await page.locator('input[placeholder*="Item name"]').fill('Custom Dress');
    await page.locator('input[placeholder="Price"]').fill('1000');
    await page.locator('button.add-custom-btn').click();

    const advanceInput = page.locator('input.advance-input');
    const balanceDueText = page.locator('.balance-value');

    // Initial state: 0 advance, 1000 balance
    await expect(balanceDueText).toContainText('₹1000');

    // Input 400 advance paid
    await advanceInput.fill('400');
    
    // Balance due should update to 600
    await expect(balanceDueText).toContainText('₹600');
  });

  test('should upload files and display them in the attachments modal', async ({ page }) => {
    // Verify Attachments section is visible
    const attachmentsTitle = page.locator('.attachments-strip .panel-card-title');
    await expect(attachmentsTitle).toBeVisible();
    await expect(attachmentsTitle).toContainText('Attachments');

    // Upload mock files to measurements
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('label[for="measurements-pos"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test-measurement.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-content')
    });

    // Check that the count badge updates to '1'
    const badge = page.locator('label[for="measurements-pos"] .asset-count-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('1');

    // Verify "View / Manage" button becomes visible and displays (1)
    const viewBtn = page.locator('button.pos-view-attachments-btn');
    await expect(viewBtn).toBeVisible();
    await expect(viewBtn).toContainText('View / Manage (1)');

    // Click "View / Manage" to open modal
    await viewBtn.click();

    // Verify modal is open and shows the thumbnail
    const modalContent = page.locator('.attachments-modal .modal-content');
    await expect(modalContent).toBeVisible();
    await expect(modalContent.locator('.group-title')).toContainText('Measurements');

    const thumbImage = modalContent.locator('.modal-thumb-item img');
    await expect(thumbImage).toBeVisible();

    // Close the modal
    await modalContent.locator('.close-modal-btn').click();
    await expect(modalContent).not.toBeVisible();
  });

});

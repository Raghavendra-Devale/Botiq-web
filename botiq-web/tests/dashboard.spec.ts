import { test, expect } from '@playwright/test';

async function performLogin(page) {
  await page.goto('http://localhost:4200/mpin-login');
  await page.locator('#loginMpin').fill('123456');
  await page.locator('button.btn-primary', { hasText: 'Verify Account' }).click();
  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/.*\/dashboard/);
}

test.describe('Dashboard Screen Page', () => {

  test.beforeEach(async ({ page }) => {
    // Perform login to bypass authGuard
    await performLogin(page);
  });

  test('should render compact header and metrics successfully', async ({ page }) => {
    // Expect dashboard title
    await expect(page.locator('.header-title h2')).toHaveText('Dashboard');

    // Verify presence of compact metrics wrapper
    const metricWrapper = page.locator('.metric-wrapper');
    await expect(metricWrapper).toBeVisible();

    // Verify there is a "Total Orders Due" summary line
    const lightText = page.locator('.light-text');
    await expect(lightText).toBeVisible();
    await expect(lightText).toContainText('Total Orders Due:');
  });

  test('should display stats grids for customer and job orders', async ({ page }) => {
    // Verify Customer Orders section
    const customerOrdersSection = page.locator('.customer-orders');
    await expect(customerOrdersSection).toBeVisible();
    await expect(customerOrdersSection.locator('.section-header')).toHaveText('Customer Orders This Week');

    // Verify Job Orders section
    const jobOrdersSection = page.locator('.job-orders');
    await expect(jobOrdersSection).toBeVisible();
    await expect(jobOrdersSection.locator('.section-header')).toHaveText('Job Orders This Week');
  });

  test('should display financial summary card values', async ({ page }) => {
    const summarySection = page.locator('.dashboard-section.summary');
    await expect(summarySection).toBeVisible();
    await expect(summarySection.locator('.section-header')).toHaveText('Financial Summary');

    // Verify due and overdue amount cards exist
    await expect(page.locator('.summary-card.due')).toBeVisible();
    await expect(page.locator('.summary-card.overdue')).toBeVisible();
  });

  test('should navigate to sales order page when clicking NEW ORDER button', async ({ page }) => {
    const newOrderButton = page.locator('button.btn-new-order', { hasText: '+ NEW ORDER' });
    await expect(newOrderButton).toBeVisible();

    // Click the button
    await newOrderButton.click();

    // Verify redirect to add-new-order tab1
    await expect(page).toHaveURL(/.*\/add-new-order\/tab1/);
  });

});

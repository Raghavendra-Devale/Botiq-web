import { test, expect, Page, Locator } from '@playwright/test';

// Use storageState to load authenticated state
test.use({ storageState: 'playwright/.auth/user.json' });

class DashboardPage {
  readonly page: Page;
  readonly headerTitle: Locator;
  readonly metricWrapper: Locator;
  readonly totalOrdersDueText: Locator;
  readonly customerOrdersSection: Locator;
  readonly customerOrdersHeader: Locator;
  readonly jobOrdersSection: Locator;
  readonly jobOrdersHeader: Locator;
  readonly financialSummarySection: Locator;
  readonly financialSummaryHeader: Locator;
  readonly dueCard: Locator;
  readonly overdueCard: Locator;
  readonly newOrderButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.headerTitle = page.locator('.header-title h2');
    this.metricWrapper = page.locator('.metric-wrapper');
    this.totalOrdersDueText = page.locator('.light-text');
    this.customerOrdersSection = page.locator('.customer-orders');
    this.customerOrdersHeader = page.locator('.customer-orders .section-header');
    this.jobOrdersSection = page.locator('.job-orders');
    this.jobOrdersHeader = page.locator('.job-orders .section-header');
    this.financialSummarySection = page.locator('.dashboard-section.summary');
    this.financialSummaryHeader = page.locator('.dashboard-section.summary .section-header');
    this.dueCard = page.locator('.summary-card.due');
    this.overdueCard = page.locator('.summary-card.overdue');
    this.newOrderButton = page.locator('button.btn-new-order', { hasText: '+ NEW ORDER' });
  }

  async navigate() {
    await this.page.goto('http://localhost:4200/dashboard');
  }

  async clickNewOrder() {
    await this.newOrderButton.click();
  }
}

test.describe('Dashboard Screen Page', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.navigate();
  });

  test('should render compact header and metrics successfully', async () => {
    await expect(dashboardPage.headerTitle).toHaveText('Dashboard');
    await expect(dashboardPage.metricWrapper).toBeVisible();
    await expect(dashboardPage.totalOrdersDueText).toBeVisible();
    await expect(dashboardPage.totalOrdersDueText).toContainText('Total Orders Due:');
  });

  test('should display stats grids for customer and job orders', async () => {
    await expect(dashboardPage.customerOrdersSection).toBeVisible();
    await expect(dashboardPage.customerOrdersHeader).toHaveText('Customer Orders This Week');
    await expect(dashboardPage.jobOrdersSection).toBeVisible();
    await expect(dashboardPage.jobOrdersHeader).toHaveText('Job Orders This Week');
  });

  test('should display financial summary card values', async () => {
    await expect(dashboardPage.financialSummarySection).toBeVisible();
    await expect(dashboardPage.financialSummaryHeader).toHaveText('Financial Summary');
    await expect(dashboardPage.dueCard).toBeVisible();
    await expect(dashboardPage.overdueCard).toBeVisible();
  });

  test('should navigate to sales order page when clicking NEW ORDER button', async () => {
    await expect(dashboardPage.newOrderButton).toBeVisible();
    await dashboardPage.clickNewOrder();
    await expect(dashboardPage.page).toHaveURL(/.*\/add-new-order\/tab1/);
  });
});

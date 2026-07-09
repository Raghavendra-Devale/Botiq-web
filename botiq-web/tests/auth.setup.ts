import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('http://localhost:4200/login');

  const phoneInput = page.getByPlaceholder('Enter phone number');
  const mpinInput = page.locator('#loginMpin');

  // Wait dynamically for the app to settle
  await Promise.race([
    phoneInput.waitFor({ state: 'visible' }).catch(() => {}),
    mpinInput.waitFor({ state: 'visible' }).catch(() => {}),
    page.waitForURL(/.*\/dashboard/).catch(() => {})
  ]);

  if (await phoneInput.isVisible()) {
    await phoneInput.fill('9998887770');
    await page.getByRole('button', { name: 'Send OTP' }).click();

    // Confirm device conflict modal if it pops up
    const confirmBtn = page.locator('button.btn-confirm-modal', { hasText: 'Confirm' });
    try {
      await confirmBtn.waitFor({ state: 'visible', timeout: 2000 });
      await confirmBtn.click();
    } catch (e) {}

    const otpDigit1 = page.getByLabel('OTP Digit 1');
    await otpDigit1.waitFor({ state: 'visible' });

    await otpDigit1.focus();
    await page.keyboard.type('123456', { delay: 100 });
    
    await page.getByRole('button', { name: 'Verify Account' }).click();
  }

  const setupPinInput = page.locator('#mpin');

  // Wait dynamically for setup page, mpin input page, or dashboard url
  await Promise.race([
    setupPinInput.waitFor({ state: 'visible' }).catch(() => {}),
    mpinInput.waitFor({ state: 'visible' }).catch(() => {}),
    page.waitForURL(/.*\/dashboard/).catch(() => {})
  ]);

  if (await setupPinInput.isVisible()) {
    await setupPinInput.fill('123456');
    await page.locator('#confirmMpin').fill('123456');
    await page.getByRole('button', { name: 'Configure PIN' }).click();
  }

  if (await mpinInput.isVisible()) {
    await mpinInput.fill('123456');
    await page.getByRole('button', { name: 'Verify Account' }).click();
  }

  // Verify successful authentication redirect to dashboard
  await expect(page).toHaveURL(/.*\/dashboard/);

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});

import { requireTestSecret } from './testCredentials.js';
import { test, expect } from '@playwright/test';

test.describe('Legal Pages QA — Runtime Verification', () => {
  const BASE_URL = 'http://127.0.0.1:8080';

  test.describe('Desktop viewport', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('/terms loads with content', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      
      const response = await page.goto(`${BASE_URL}/terms`);
      expect(response?.status()).toBe(200);
      
      // Use .first() — App.tsx has 2 <main> tags (desktop + mobile), both in DOM
      await expect(page.locator('main').getByText(/Terms of Service/i).first()).toBeVisible({ timeout: 5000 });
      
      await page.waitForTimeout(1000);
      expect(consoleErrors).toHaveLength(0);
    });

    test('/privacy loads with content', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      
      const response = await page.goto(`${BASE_URL}/privacy`);
      expect(response?.status()).toBe(200);
      
      await expect(page.locator('main').getByText(/Privacy Policy/i).first()).toBeVisible({ timeout: 5000 });
      
      await page.waitForTimeout(1000);
      expect(consoleErrors).toHaveLength(0);
    });

    test('/refund loads with content', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      
      const response = await page.goto(`${BASE_URL}/refund`);
      expect(response?.status()).toBe(200);
      
      await expect(page.locator('main').getByText(/Refund Policy/i).first()).toBeVisible({ timeout: 5000 });
      
      await page.waitForTimeout(1000);
      expect(consoleErrors).toHaveLength(0);
    });
  });

  test.describe('Mobile viewport', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('/terms loads on mobile', async ({ page }) => {
      await page.goto(`${BASE_URL}/terms`);
      // Mobile viewport — desktop <main> is hidden, mobile <main> is last() in DOM
      await expect(page.locator('main').getByText(/Terms of Service/i).last()).toBeVisible({ timeout: 5000 });
    });

    test('/privacy loads on mobile', async ({ page }) => {
      await page.goto(`${BASE_URL}/privacy`);
      await expect(page.locator('main').getByText(/Privacy Policy/i).last()).toBeVisible({ timeout: 5000 });
    });

    test('/refund loads on mobile', async ({ page }) => {
      await page.goto(`${BASE_URL}/refund`);
      await expect(page.locator('main').getByText(/Refund Policy/i).last()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Signup form checkbox links', () => {
    test('checkbox has 3 links + navigation works', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/auth`);
      
      // Switch to Sign Up tab
      await page.getByRole('tab', { name: /sign up/i }).click();
      await page.waitForTimeout(500);
      
      // Find checkbox label by htmlFor="terms"
      const checkboxLabel = page.locator('label[for="terms"]');
      await expect(checkboxLabel).toBeVisible({ timeout: 5000 });
      
      // Verify 3 links present in label
      const links = checkboxLabel.locator('a');
      await expect(links).toHaveCount(3);
      
      const linkTexts = await links.allTextContents();
      expect(linkTexts).toContain('Terms of Service');
      expect(linkTexts).toContain('Privacy Policy');
      expect(linkTexts).toContain('Refund Policy');
      
      // Verify submit button disabled initially
      const submitButton = page.getByRole('button', { name: /sign up/i }).last();
      await expect(submitButton).toBeDisabled();
      
      // Check the checkbox
      await page.locator('#terms').check();
      await page.waitForTimeout(200);
      
      // Click Terms link and verify navigation (target="_blank")
      const [termsPage] = await Promise.all([
        context.waitForEvent('page'),
        links.first().click()
      ]);
      await termsPage.waitForLoadState();
      expect(termsPage.url()).toContain('/terms');
      await expect(termsPage.locator('main').getByText(/Terms of Service/i).first()).toBeVisible();
      await termsPage.close();
      
      // Click Privacy link
      const [privacyPage] = await Promise.all([
        context.waitForEvent('page'),
        links.nth(1).click()
      ]);
      await privacyPage.waitForLoadState();
      expect(privacyPage.url()).toContain('/privacy');
      await expect(privacyPage.locator('main').getByText(/Privacy Policy/i).first()).toBeVisible();
      await privacyPage.close();
      
      // Click Refund link
      const [refundPage] = await Promise.all([
        context.waitForEvent('page'),
        links.nth(2).click()
      ]);
      await refundPage.waitForLoadState();
      expect(refundPage.url()).toContain('/refund');
      await expect(refundPage.locator('main').getByText(/Refund Policy/i).first()).toBeVisible();
      await refundPage.close();
    });
  });

  test.describe('SubscriptionTab — Cancel UX', () => {
    test('Settings loads, Subscription tab clickable', async ({ page }) => {
      // Auth with test account
      await page.goto(`${BASE_URL}/auth`);
      await page.locator('input[type="email"]').first().fill('aaa@aaa.com');
      await page.locator('input[type="password"]').first().fill(requireTestSecret('TESTER1_PASSWORD1'));
      await page.getByRole('button', { name: /sign in/i }).last().click();
      await page.waitForURL(/\/(dashboard|calendar)/, { timeout: 30000 });

      // Navigate to Settings
      await page.goto(`${BASE_URL}/settings`);
      await page.waitForLoadState('networkidle');

      // Click Subscription tab
      const subTab = page.getByRole('tab', { name: /subscription/i });
      await expect(subTab).toBeVisible({ timeout: 5000 });
      await subTab.click();
      await page.waitForTimeout(500);

      // Verify tab content loaded (either Premium card or Free plan card)
      const premiumCard = page.getByText(/Premium Active/i);
      const freeCard = page.getByText(/Free Plan/i);
      await expect(premiumCard.or(freeCard).first()).toBeVisible({ timeout: 5000 });
    });

    test('Cancel button visible for Premium users (skip if Free)', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      await page.locator('input[type="email"]').first().fill('aaa@aaa.com');
      await page.locator('input[type="password"]').first().fill(requireTestSecret('TESTER1_PASSWORD1'));
      await page.getByRole('button', { name: /sign in/i }).last().click();
      await page.waitForURL(/\/(dashboard|calendar)/, { timeout: 10000 });

      await page.goto(`${BASE_URL}/settings`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('tab', { name: /subscription/i }).click();
      await page.waitForTimeout(500);

      // Check if Premium or Free
      const isPremium = await page.getByText(/Premium Active/i).isVisible();
      
      if (!isPremium) {
        test.skip(true, 'Test account is Free — cannot verify Premium-only cancel button');
        return;
      }

      // Verify Cancel Subscription button exists
      const cancelButton = page.getByRole('button', { name: /Cancel Subscription/i });
      await expect(cancelButton).toBeVisible({ timeout: 5000 });
    });

    test('Clicking Cancel opens AlertDialog with correct content', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      await page.locator('input[type="email"]').first().fill('aaa@aaa.com');
      await page.locator('input[type="password"]').first().fill(requireTestSecret('TESTER1_PASSWORD1'));
      await page.getByRole('button', { name: /sign in/i }).last().click();
      await page.waitForURL(/\/(dashboard|calendar)/, { timeout: 10000 });

      await page.goto(`${BASE_URL}/settings`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('tab', { name: /subscription/i }).click();
      await page.waitForTimeout(500);

      const isPremium = await page.getByText(/Premium Active/i).isVisible();
      if (!isPremium) {
        test.skip(true, 'Test account is Free — skipping Premium cancel dialog test');
        return;
      }

      // Click Cancel Subscription button
      const cancelButton = page.getByRole('button', { name: /Cancel Subscription/i });
      await cancelButton.click();
      await page.waitForTimeout(500);

      // Verify dialog title
      const dialogTitle = page.getByRole('heading', { name: /Cancel Premium Subscription\?/i });
      await expect(dialogTitle).toBeVisible({ timeout: 5000 });

      // Verify dialog description contains billing period wording
      const dialogDesc = page.locator('[role="alertdialog"] p');
      await expect(dialogDesc).toBeVisible();
      const descText = await dialogDesc.textContent();
      expect(descText?.toLowerCase()).toMatch(/(billing period|current billing period)/);

      // Verify both buttons present
      const keepButton = page.getByRole('button', { name: /Keep Premium/i });
      const confirmButton = page.getByRole('button', { name: /Yes.*[Cc]ancel/i });
      await expect(keepButton).toBeVisible();
      await expect(confirmButton).toBeVisible();
    });

    test('ESC key closes dialog', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      await page.locator('input[type="email"]').first().fill('aaa@aaa.com');
      await page.locator('input[type="password"]').first().fill(requireTestSecret('TESTER1_PASSWORD1'));
      await page.getByRole('button', { name: /sign in/i }).last().click();
      await page.waitForURL(/\/(dashboard|calendar)/, { timeout: 10000 });

      await page.goto(`${BASE_URL}/settings`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('tab', { name: /subscription/i }).click();
      await page.waitForTimeout(500);

      const isPremium = await page.getByText(/Premium Active/i).isVisible();
      if (!isPremium) {
        test.skip(true, 'Test account is Free');
        return;
      }

      const cancelButton = page.getByRole('button', { name: /Cancel Subscription/i });
      await cancelButton.click();
      await page.waitForTimeout(500);

      // Verify dialog open
      const dialogTitle = page.getByRole('heading', { name: /Cancel Premium Subscription\?/i });
      await expect(dialogTitle).toBeVisible();

      // Press ESC
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Verify dialog closed
      await expect(dialogTitle).not.toBeVisible();
    });

    test('"Keep Premium" button closes dialog without action', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      await page.locator('input[type="email"]').first().fill('aaa@aaa.com');
      await page.locator('input[type="password"]').first().fill(requireTestSecret('TESTER1_PASSWORD1'));
      await page.getByRole('button', { name: /sign in/i }).last().click();
      await page.waitForURL(/\/(dashboard|calendar)/, { timeout: 10000 });

      await page.goto(`${BASE_URL}/settings`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('tab', { name: /subscription/i }).click();
      await page.waitForTimeout(500);

      const isPremium = await page.getByText(/Premium Active/i).isVisible();
      if (!isPremium) {
        test.skip(true, 'Test account is Free');
        return;
      }

      const cancelButton = page.getByRole('button', { name: /Cancel Subscription/i });
      await cancelButton.click();
      await page.waitForTimeout(500);

      const dialogTitle = page.getByRole('heading', { name: /Cancel Premium Subscription\?/i });
      await expect(dialogTitle).toBeVisible();

      // Click "Keep Premium"
      const keepButton = page.getByRole('button', { name: /Keep Premium/i });
      await keepButton.click();
      await page.waitForTimeout(300);

      // Dialog should close
      await expect(dialogTitle).not.toBeVisible();
    });
  });
});

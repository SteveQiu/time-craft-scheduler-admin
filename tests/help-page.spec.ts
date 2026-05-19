import { test, expect } from '@playwright/test';

test.describe('Help Page — Runtime Verification', () => {
  const BASE_URL = 'http://127.0.0.1:8082';

  test.describe('Desktop viewport', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('/help loads without authentication', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      
      const response = await page.goto(`${BASE_URL}/help`);
      expect(response?.status()).toBe(200);
      
      // Verify main heading
      await expect(page.locator('main').getByText(/Help & Tutorial/i).first()).toBeVisible({ timeout: 5000 });
      
      // Verify page not blank — check for content
      await expect(page.locator('main').first()).toContainText(/Learn how to use PikAppoint/i);
      
      await page.waitForTimeout(1000);
      expect(consoleErrors).toHaveLength(0);
    });

    test('Video tutorial card displays correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/help`);
      
      // Verify video card heading (use .first() for desktop/mobile dual render)
      await expect(page.getByText(/Video Tutorial/i).first()).toBeVisible({ timeout: 5000 });
      
      // Verify "Watch Tutorial" button present
      const watchButton = page.getByRole('link', { name: /Watch Tutorial/i }).first();
      await expect(watchButton).toBeVisible();
      
      // Verify button has external link
      const href = await watchButton.getAttribute('href');
      expect(href).toContain('github.com');
      expect(href).toContain('pikappoint-demo.mp4');
    });

    test('Feature guide cards display (4+ cards)', async ({ page }) => {
      await page.goto(`${BASE_URL}/help`);
      
      // Wait for page load
      await expect(page.getByText(/Help & Tutorial/i).first()).toBeVisible({ timeout: 5000 });
      
      // Verify key feature cards (use .first() for desktop/mobile)
      await expect(page.getByText(/Browse Providers/i).first()).toBeVisible();
      await expect(page.getByText(/Book an Appointment/i).first()).toBeVisible();
      await expect(page.getByText(/Manage Openings/i).first()).toBeVisible();
      await expect(page.getByText(/View Reservations/i).first()).toBeVisible();
    });
  });

  test.describe('Mobile viewport', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('/help loads on mobile', async ({ page }) => {
      await page.goto(`${BASE_URL}/help`);
      // Mobile viewport — desktop <main> is hidden, mobile <main> is last() in DOM
      await expect(page.locator('main').getByText(/Help & Tutorial/i).last()).toBeVisible({ timeout: 5000 });
      
      // Verify video tutorial still visible (use .last() for mobile)
      await expect(page.getByText(/Video Tutorial/i).last()).toBeVisible();
      
      // Verify Watch Tutorial button
      await expect(page.getByRole('link', { name: /Watch Tutorial/i }).last()).toBeVisible();
    });
  });

  test.describe('Unauthenticated access', () => {
    test('Guest users can access /help', async ({ page }) => {
      // Go directly to help without login
      await page.goto(`${BASE_URL}/help`);
      
      // Page should load successfully
      await expect(page.locator('main').getByText(/Help & Tutorial/i).first()).toBeVisible({ timeout: 5000 });
      
      // Verify content is visible (use .first())
      await expect(page.getByText(/Watch Tutorial/i).first()).toBeVisible();
      await expect(page.getByText(/Browse Providers/i).first()).toBeVisible();
    });
  });
});

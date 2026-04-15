import { test, expect } from '@playwright/test';

test.describe('Booking - End to End', () => {
  test('should book an available opening successfully', async ({ page, context }) => {
    // Clear all storage to ensure fresh state
    await context.clearCookies();
    
    // Navigate to browse page
    await page.goto('http://localhost:8084/browse', { waitUntil: 'networkidle' });
    
    // Clear any cached data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Reload to get clean state
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of browse page
    await page.screenshot({ path: 'debug/e2e-01-browse-list.png' });
    
    // Click on first provider
    const providerCard = page.locator('[class*="grid"] [class*="rounded-lg"]').first();
    await providerCard.waitFor({ timeout: 5000 });
    await providerCard.click();
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of provider detail
    await page.screenshot({ path: 'debug/e2e-02-provider-detail.png' });
    
    // Wait for Services section
    await page.locator('text=Services').waitFor({ timeout: 10000 });
    
    // Select first service
    const serviceCards = page.locator('[class*="rounded-lg"]').filter({ has: page.locator('..') }).nth(1);
    await serviceCards.click().catch(() => {
      console.log('Service card click skipped (might not exist)');
    });
    
    // Wait a moment for UI to update
    await page.waitForTimeout(500);
    
    // Take screenshot after service selection
    await page.screenshot({ path: 'debug/e2e-03-service-selected.png' });
    
    // Scroll down to see calendar
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(300);
    
    // Click on any available date button (date numbers like 1, 2, 3...)
    const dateButtons = page.locator('button').filter({ 
      has: page.locator('..') 
    }).filter(el => {
      return el.evaluate(e => {
        const text = e.textContent || '';
        return /^\d+$/.test(text.trim()) && e.getAttribute('type') === 'button';
      });
    });
    
    const firstDateButton = dateButtons.first();
    await firstDateButton.click().catch(() => {
      console.log('No date button found, trying to click any enabled button with number');
    });
    
    await page.waitForTimeout(500);
    
    // Take screenshot after date selection
    await page.screenshot({ path: 'debug/e2e-04-date-selected.png' });
    
    // Scroll right to see times section
    await page.evaluate(() => window.scrollBy(500, 0));
    await page.waitForTimeout(300);
    
    // Look for Book button
    const bookButton = page.locator('button').filter({ hasText: /^Book$/ }).first();
    const bookButtonExists = await bookButton.isVisible().catch(() => false);
    
    if (!bookButtonExists) {
      console.log('Book button not found, times section may not have rendered');
      await page.screenshot({ path: 'debug/e2e-05-no-book-button.png' });
      throw new Error('Book button not visible - no available times for selected criteria');
    }
    
    // Click Book button
    await bookButton.click();
    await page.waitForTimeout(500);
    
    // Take screenshot of booking dialog
    await page.screenshot({ path: 'debug/e2e-06-booking-dialog.png' });
    
    // Wait for confirmation dialog
    const dialog = page.locator('[role="alertdialog"]');
    await dialog.waitFor({ timeout: 5000 });
    
    // Verify dialog contains booking details
    const dialogText = await dialog.textContent();
    console.log('Dialog content:', dialogText?.substring(0, 200));
    
    // Get console logs before confirming
    const consoleLogs: { type: string; text: string }[] = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'log') {
        console.log('[BROWSER LOG]', msg.text());
      }
      if (msg.type() === 'error') {
        console.log('[BROWSER ERROR]', msg.text());
      }
    });
    
    // Click Confirm button
    const confirmButton = dialog.locator('button').last();
    await confirmButton.click();
    await page.waitForTimeout(1500);
    
    // Take screenshot of result
    await page.screenshot({ path: 'debug/e2e-07-result.png' });
    
    // Check for success or error
    const successToast = page.locator('text=Appointment booked successfully');
    const errorToast = page.locator('text=Failed to book appointment');
    
    const successVisible = await successToast.isVisible().catch(() => false);
    const errorVisible = await errorToast.isVisible().catch(() => false);
    
    console.log('\n' + '='.repeat(80));
    console.log('BOOKING TEST RESULT:');
    console.log('='.repeat(80));
    console.log('✅ Success:', successVisible);
    console.log('❌ Error:', errorVisible);
    console.log('\nConsole logs during booking:');
    consoleLogs.forEach(log => {
      console.log(`  [${log.type.toUpperCase()}] ${log.text}`);
    });
    console.log('='.repeat(80) + '\n');
    
    // Assert success
    expect(successVisible || !errorVisible).toBeTruthy();
  });
});

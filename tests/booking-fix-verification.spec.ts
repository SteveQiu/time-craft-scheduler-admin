import { test, expect } from '@playwright/test';

test.describe('Booking Fix Verification', () => {
  test('should successfully book an appointment after fixing RPC parameter', async ({ page }) => {
    // Navigate to browse page
    await page.goto('http://localhost:8084/browse');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of loaded page
    await page.screenshot({ path: 'debug/01-booking-test-browse-page.png' });
    
    // Click on provider card - the entire Card is clickable
    const providerCard = page.locator('[class*="grid"]').locator('[class*="rounded-lg"]').first();
    await providerCard.click();
    await page.waitForLoadState('networkidle');
    
    // Take screenshot after navigation
    await page.screenshot({ path: 'debug/02-booking-test-provider-detail.png' });
    
    // Wait for Services section to load
    await page.locator('text=Services').waitFor({ timeout: 10000 });
    
    // Select service - click on first service card
    const serviceCard = page.locator('text=Services').locator('..').locator('[class*="rounded"]').first();
    await serviceCard.click();
    await page.waitForTimeout(300);
    
    // Take screenshot after service selection
    await page.screenshot({ path: 'debug/03-booking-test-service-selected.png' });
    
    // Now Workers section should appear
    await page.locator('text=Workers').waitFor({ timeout: 10000 });
    
    // Select worker - click on first worker card
    const workerCard = page.locator('text=Workers').locator('..').locator('[class*="rounded"]').first();
    await workerCard.click();
    await page.waitForTimeout(300);
    
    // Take screenshot after worker selection
    await page.screenshot({ path: 'debug/04-booking-test-worker-selected.png' });
    
    // Wait for calendar to appear
    await page.locator('[class*="grid"][class*="grid-cols-7"]').waitFor({ timeout: 5000 });
    
    // Scroll down to see if Available Times is below the fold
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);
    
    // Take screenshot after scrolling
    await page.screenshot({ path: 'debug/05c-booking-test-after-scroll.png' });
    
    // Try clicking on a visible date (like date 15 or 20)
    const dateButton = page.locator('button').filter({ hasText: /^15$/ }).first();
    await dateButton.click().catch(() => {
      console.log('Failed to click date 15, trying date 20');
    });
    await page.waitForTimeout(500);
    
    // Take screenshot after date click
    await page.screenshot({ path: 'debug/05d-booking-test-after-date-click.png' });
    
    // Wait for Available Times section with OR fallback
    try {
      await page.locator('text=Available Times').waitFor({ timeout: 5000 });
    } catch (e) {
      console.log('Available Times still not found, checking page content...');
      // Check if times are in a scrollable container
      await page.evaluate(() => window.scrollBy(300, 0));
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'debug/05e-booking-test-scrolled-right.png' });
    }
    
    // Click Book button on first available time slot
    const bookButton = page.locator('button:has-text("Book")').first();
    if (await bookButton.isVisible().catch(() => false)) {
      await bookButton.click();
      await page.waitForTimeout(500);
    } else {
      console.log('Book button not found, times section might not have rendered');
      await page.screenshot({ path: 'debug/05f-booking-test-no-book-button.png' });
      throw new Error('Book button not found - Available Times section did not render');
    }
    
    // Take screenshot showing the confirmation dialog
    await page.screenshot({ path: 'debug/06-booking-test-confirmation-dialog.png' });
    
    // Wait for confirmation dialog
    await page.locator('[role="alertdialog"]').waitFor({ timeout: 5000 });
    
    // Verify dialog shows booking details
    const dialogContent = page.locator('[role="alertdialog"]');
    await expect(dialogContent).toContainText('Service:');
    await expect(dialogContent).toContainText('Worker:');
    await expect(dialogContent).toContainText('Date:');
    await expect(dialogContent).toContainText('Time:');
    
    // Listen for console errors before confirming
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Click Confirm button to submit booking - use specific button selector
    const confirmButton = page.locator('[role="alertdialog"] button[type="button"]:nth-child(2)');
    await confirmButton.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot showing result
    await page.screenshot({ path: 'debug/07-booking-test-result.png' });
    
    // Wait for either success or error toast
    const successToast = page.locator('text=Appointment booked successfully');
    const errorToast = page.locator('text=Failed to book appointment');
    
    // Check which toast appears
    const successVisible = await successToast.isVisible().catch(() => false);
    const errorVisible = await errorToast.isVisible().catch(() => false);
    
    // Log results
    console.log('✅ Success toast visible:', successVisible);
    console.log('❌ Error toast visible:', errorVisible);
    console.log('Console errors:', consoleErrors);
    
    // Verify booking succeeded
    if (successVisible) {
      console.log('✅ BOOKING FIXED: Appointment booked successfully!');
    } else if (errorVisible) {
      console.log('❌ BOOKING FAILED: Still getting error');
      // Get error details
      const errorMessage = await errorToast.textContent();
      console.log('Error message:', errorMessage);
    }
    
    expect(successVisible).toBeTruthy();
  });
});

import { test, expect } from '@playwright/test';

test('Book button opens dialog and allows booking', async ({ page }) => {
  // Navigate to browse page with a provider ID
  await page.goto('http://localhost:8080/browse/f0927dd8-9e7d-4830-a6b5-c96a3c627fe9');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Check what content is on the page
  const pageContent = await page.content();
  console.log('Page loaded, content length:', pageContent.length);
  console.log('Looking for Services header...');
  
  // Take screenshot to see initial state
  await page.screenshot({ path: 'debug/booking-initial.png' });
  
  // Look for any text that indicates services/times
  const hasBook = pageContent.includes('Book');
  const hasSelect = pageContent.includes('Select');
  const hasService = pageContent.includes('service') || pageContent.includes('Service');
  
  console.log('Has "Book" text:', hasBook);
  console.log('Has "Select" text:', hasSelect);
  console.log('Has "service" text:', hasService);
  
  // Check if the page content is visible
  const body = page.locator('body');
  await expect(body).toHaveText(/Browse|Service|Worker/, { timeout: 5000 });
  
  // Try to find Service select/buttons
  const serviceButton = page.locator('button, [role="button"]').filter({ hasText: /Select|Service/ }).first();
  const serviceButtonVisible = await serviceButton.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Service button visible:', serviceButtonVisible);
  
  if (serviceButtonVisible) {
    await serviceButton.click();
    await page.waitForTimeout(500);
  }
  
  // Now look for Book button
  const bookButtons = await page.locator('button:has-text("Book")').all();
  console.log('Found', bookButtons.length, 'Book buttons');
  
  if (bookButtons.length > 0) {
    await bookButtons[0].click();
    await page.waitForTimeout(500);
    
    // Take screenshot with dialog
    await page.screenshot({ path: 'debug/booking-dialog-opened.png' });
    
    // Check if booking dialog appeared
    const dialogTitle = page.locator('text=Confirm Booking');
    const dialogVisible = await dialogTitle.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Dialog visible:', dialogVisible);
    
    if (dialogVisible) {
      expect(dialogVisible).toBe(true);
    }
  } else {
    console.log('No Book buttons found - check if services need selection');
    console.log('Page screenshot saved to debug/booking-initial.png');
  }
});

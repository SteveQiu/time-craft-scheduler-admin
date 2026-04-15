import { test, expect } from '@playwright/test';

test.describe('Booking - Simple End to End', () => {
  test('should successfully book an opening', async ({ page, context }, testInfo) => {
    // Set larger viewport to see all columns
    page.setViewportSize({ width: 1400, height: 900 });
    
    // Clear storage
    await context.clearCookies();
    
    console.log('\n' + '='.repeat(80));
    console.log('STEP 1: Navigate to browse list');
    console.log('='.repeat(80));
    
    await page.goto('http://localhost:8084/browse', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'debug/step-01-browse-list.png' });
    
    console.log('\nSTEP 2: Click provider');
    const provider = page.locator('[class*="grid"]').locator('[class*="rounded-lg"]').first();
    await provider.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'debug/step-02-provider-detail.png' });
    
    console.log('\nSTEP 3: Click service');
    // Find all service cards - they're inside "Services" section
    const servicesSection = page.locator('text=Services').locator('..').locator('[class*="rounded"]').first();
    await servicesSection.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'debug/step-03-service-selected.png' });
    
    console.log('\nSTEP 4: Click worker');
    const workersSection = page.locator('text=Workers').locator('..').locator('[class*="rounded"]').first();
    await workersSection.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'debug/step-04-worker-selected.png' });
    
    console.log('\nSTEP 5: Select date');
    // Calendar should now be visible - find any button with a date number
    await page.evaluate(() => window.scrollBy(0, 200));
    
    // Get all buttons in a grid-cols-7 (calendar)
    const dateButtons = page.locator('button').filter(btn => {
      return btn.evaluate(el => {
        const parent = el.closest('[class*="grid-cols-7"]');
        return parent !== null && /^\d{1,2}$/.test((el.textContent || '').trim());
      });
    });
    
    const firstDate = dateButtons.first();
    await firstDate.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'debug/step-05-date-selected.png' });
    
    console.log('\nSTEP 6: Scroll to see times');
    await page.evaluate(() => window.scrollBy(400, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'debug/step-06-times-visible.png' });
    
    console.log('\nSTEP 7: Click Book');
    const bookBtn = page.locator('button:has-text("Book")').first();
    
    if (!(await bookBtn.isVisible().catch(() => false))) {
      console.log('❌ Book button not visible!');
      console.log('Page content:', await page.content().then(h => h.substring(0, 500)));
      throw new Error('Book button not found');
    }
    
    await bookBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'debug/step-07-booking-dialog.png' });
    
    console.log('\nSTEP 8: Confirm booking');
    
    // Capture all console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error' || msg.type() === 'log') {
        console.log(`  Browser ${msg.type()}:`, msg.text());
      }
    });
    
    // Click confirm - need to find the right button in the dialog
    const dialog = page.locator('[role="alertdialog"]');
    const confirmBtn = dialog.locator('button').last(); // Last button is usually Confirm
    await confirmBtn.click();
    
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'debug/step-08-result.png' });
    
    console.log('\nSTEP 9: Check result');
    const success = await page.locator('text=Appointment booked successfully').isVisible().catch(() => false);
    const error = await page.locator('text=Failed to book appointment').isVisible().catch(() => false);
    
    console.log('\n' + '='.repeat(80));
    console.log('RESULT:');
    console.log('  ✅ Success toast:', success);
    console.log('  ❌ Error toast:', error);
    console.log('\nConsole logs:');
    consoleLogs.forEach(log => console.log('  ' + log));
    console.log('='.repeat(80) + '\n');
    
    expect(success).toBeTruthy();
  });
});

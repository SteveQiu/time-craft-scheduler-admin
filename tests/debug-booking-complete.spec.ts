import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Reproduce booking error - complete flow', async ({ page }) => {
  const debugDir = path.join(process.cwd(), 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  // Capture all network responses
  const networkResponses: any[] = [];
  const consoleLogs: string[] = [];
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('book_opening') || url.includes('opening')) {
      try {
        const text = await response.text();
        networkResponses.push({
          url,
          status: response.status(),
          body: text,
          timestamp: new Date().toISOString()
        });
        console.log(`[Network] ${url.split('/').pop()} - ${response.status()}`);
      } catch (e) {}
    }
  });

  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') console.log(`[ERROR] ${msg.text()}`);
  });

  try {
    console.log('\n=== BOOKING ERROR DEBUG TEST ===\n');

    console.log('Step 1: Navigate to browse page');
    await page.goto('http://localhost:8080/browse');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(debugDir, 'step1-browse-list.png') });

    console.log('Step 2: Click on Test Org provider');
    await page.locator('text=Test Org').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(debugDir, 'step2-provider-detail.png') });

    console.log('Step 3: Select first service (Hair cut)');
    await page.locator('text=Hair cut').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(debugDir, 'step3-service-selected.png') });

    console.log('Step 4: Find and select first worker');
    // Workers should now appear in the Workers section on the right
    // Look for clickable worker cards
    const workerCards = page.locator('[class*="cursor-pointer"]').filter({ hasText: /Rio|Steve|Andy|John/ });
    const workerCardCount = await workerCards.count();
    console.log(`  Found ${workerCardCount} worker cards`);
    
    if (workerCardCount > 0) {
      // Click first worker card (should have cursor-pointer class)
      await workerCards.first().click();
      await page.waitForTimeout(1000);
      console.log('  ✓ Selected first worker');
      await page.screenshot({ path: path.join(debugDir, 'step4-worker-selected.png') });
      
      // Now wait a bit for calendar to render
      await page.waitForTimeout(500);
    } else {
      console.log('  ⚠ No worker cards found');
    }

    console.log('Step 5: Select a date from calendar');
    // After worker selection, calendar should appear with date buttons
    // Look for day numbers in the calendar (1-31)
    const dayButtons = page.locator('button').filter({ hasText: /^\d{1,2}$/ });
    const dayCount = await dayButtons.count();
    console.log(`  Found ${dayCount} date buttons`);
    
    if (dayCount > 0) {
      // Find first enabled (non-gray) date button
      let clicked = false;
      for (let i = 0; i < Math.min(dayCount, 40); i++) {
        const btn = dayButtons.nth(i);
        const classList = await btn.getAttribute('class') || '';
        const isDisabled = classList.includes('cursor-not-allowed') || classList.includes('text-muted-foreground/50');
        
        if (!isDisabled) {
          const dateText = await btn.textContent();
          console.log(`  Clicking date button: ${dateText}`);
          await btn.click();
          await page.waitForTimeout(800);
          clicked = true;
          break;
        }
      }
      if (clicked) {
        console.log('  ✓ Selected a date');
        await page.screenshot({ path: path.join(debugDir, 'step5-date-selected.png') });
      }
    }

    console.log('Step 6: Look for time slots and Book button');
    // After date selection, time slots should appear on the right
    const bookButtons = page.locator('button').filter({ hasText: /^Book$/ });
    const bookButtonCount = await bookButtons.count();
    console.log(`  Found ${bookButtonCount} Book buttons`);
    
    if (bookButtonCount > 0) {
      await page.screenshot({ path: path.join(debugDir, 'step6-times-visible.png') });
      
      console.log('\nStep 7: Click Book button');
      await bookButtons.first().click();
      await page.waitForTimeout(1500);
      console.log('  ✓ Book button clicked');
      
      await page.screenshot({ path: path.join(debugDir, 'step7-after-book-click.png') });
      
      // Check for error toast
      await page.waitForTimeout(1000);
      const errorMsg = page.locator('text=Failed to book appointment');
      const hasError = await errorMsg.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (hasError) {
        console.log('\n❌ ERROR FOUND: "Failed to book appointment" toast appeared\n');
        await page.screenshot({ path: path.join(debugDir, 'step8-error-toast.png') });
      } else {
        const successMsg = page.locator('text=successfully');
        const hasSuccess = await successMsg.isVisible({ timeout: 1000 }).catch(() => false);
        if (hasSuccess) {
          console.log('\n✓ SUCCESS: Booking appeared to succeed\n');
        } else {
          console.log('\nℹ No error or success message visible (may be waiting)\n');
        }
      }
    } else {
      console.log('  ✗ No Book buttons found - selection incomplete');
    }

    await page.waitForLoadState('networkidle');

  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: path.join(debugDir, 'error.png') });
  }

  console.log('=== SAVING DEBUG INFO ===\n');
  
  // Save network responses
  fs.writeFileSync(
    path.join(debugDir, 'network-book-opening.json'),
    JSON.stringify(networkResponses, null, 2)
  );
  console.log(`✓ Network responses saved (${networkResponses.length} requests)`);
  
  // Save console logs
  fs.writeFileSync(
    path.join(debugDir, 'console-logs-complete.txt'),
    consoleLogs.join('\n')
  );
  console.log(`✓ Console logs saved (${consoleLogs.length} lines)`);

  // Report any book_opening RPC responses
  const bookOpeningResponses = networkResponses.filter(r => r.url.includes('book_opening'));
  if (bookOpeningResponses.length > 0) {
    console.log('\n📡 BOOK_OPENING RPC RESPONSES:');
    bookOpeningResponses.forEach(r => {
      console.log(`  Status: ${r.status}`);
      if (r.body) {
        try {
          const parsed = JSON.parse(r.body);
          console.log(`  Response: ${JSON.stringify(parsed, null, 2)}`);
        } catch {
          console.log(`  Response: ${r.body.substring(0, 300)}`);
        }
      }
    });
  } else {
    console.log('\nℹ No book_opening RPC responses captured');
  }

  console.log('\n=== SCREENSHOTS SAVED ===');
  console.log('  step1-browse-list.png');
  console.log('  step2-provider-detail.png');
  console.log('  step3-service-selected.png');
  console.log('  step4-worker-selected.png');
  console.log('  step5-date-selected.png');
  console.log('  step6-times-visible.png');
  console.log('  step7-after-book-click.png');
  console.log('  step8-error-toast.png (if error occurred)');
});

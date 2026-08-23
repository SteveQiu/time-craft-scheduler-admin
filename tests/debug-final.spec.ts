import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Reproduce booking error - final comprehensive test', async ({ page }, testInfo) => {
  const debugDir = path.join(process.cwd(), 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  // Increase timeout
  testInfo.setTimeout(120000);

  // Capture all network responses
  const networkResponses: any[] = [];
  const consoleLogs: string[] = [];
  
  page.on('response', async response => {
    const url = response.url();
    // Capture any RPC-related responses
    if (url.includes('/rest/v1/rpc/') || url.includes('book_opening')) {
      try {
        const text = await response.text();
        networkResponses.push({
          url: url.replace(/\?.*/, ''), // Clean up query params for readability
          status: response.status(),
          body: text.substring(0, 800),
          method: response.request().method(),
          timestamp: new Date().toISOString()
        });
        const methodName = url.split('/').pop()?.split('?')[0] || 'unknown';
        console.log(`[RPC] ${methodName} - ${response.status()}`);
        if (response.status() >= 400) {
          console.log(`  ERROR RESPONSE: ${text.substring(0, 200)}`);
        }
      } catch {
        // Ignore response parsing errors
      }
    }
  });

  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') console.log(`[ERROR] ${msg.text()}`);
  });

  try {
    console.log('\n=== BOOKING ERROR REPRODUCTION TEST ===\n');

    console.log('Step 1: Navigate to browse page');
    await page.goto('http://localhost:8080/browse');
    await page.waitForLoadState('networkidle');

    console.log('Step 2: Click on Test Org provider');
    await page.locator('text=Test Org').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(debugDir, 'step2-provider-detail.png') });

    console.log('Step 3: Select first service (Hair cut)');
    await page.locator('text=Hair cut').click();
    await page.waitForTimeout(1000);

    console.log('Step 4: Select first worker (Steve)');
    // Now click on a worker card - look for the one with "Steve" that's clickable
    const steveWorker = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Steve' }).first();
    await steveWorker.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(debugDir, 'step4-worker-selected.png') });

    console.log('Step 5: Find available dates in calendar');
    // Get all date buttons
    const allDateButtons = page.locator('button').filter({ hasText: /^\d{1,2}$/ });
    const totalDates = await allDateButtons.count();
    console.log(`  Total date buttons: ${totalDates}`);
    
    // Log info about the first few date buttons
    for (let i = 0; i < Math.min(5, totalDates); i++) {
      const btn = allDateButtons.nth(i);
      const text = await btn.textContent();
      const classList = await btn.getAttribute('class') || '';
      const isDisabled = classList.includes('cursor-not-allowed') || classList.includes('text-muted-foreground');
      console.log(`    Button ${i}: date=${text}, disabled=${isDisabled}`);
    }
    
    // Try to find an enabled (non-disabled) date button
    let enabledDateIndex = -1;
    for (let i = 0; i < totalDates; i++) {
      const btn = allDateButtons.nth(i);
      const classList = await btn.getAttribute('class') || '';
      const isDisabled = classList.includes('cursor-not-allowed') || classList.includes('text-muted-foreground/50');
      if (!isDisabled && classList.includes('bg-primary/10')) {
        enabledDateIndex = i;
        console.log(`  Found enabled date button at index ${i}`);
        break;
      }
    }
    
    if (enabledDateIndex === -1) {
      console.log('  ⚠ No enabled dates found! Trying to click first non-past-month date...');
      // Just try the first button that's not completely disabled
      const btn = allDateButtons.first();
      const isDisabled = await btn.isDisabled();
      console.log(`  First button disabled: ${isDisabled}`);
    } else {
      console.log(`\nStep 6: Click date button at index ${enabledDateIndex}`);
      await allDateButtons.nth(enabledDateIndex).click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(debugDir, 'step6-date-selected.png') });
    }

    console.log('\nStep 7: Look for Book button');
    const bookButtons = page.locator('button').filter({ hasText: /^Book$/ });
    const bookCount = await bookButtons.count();
    console.log(`  Found ${bookCount} Book buttons`);
    
    if (bookCount > 0) {
      await page.screenshot({ path: path.join(debugDir, 'step7-before-book.png') });
      
      console.log('\nStep 8: Click Book button to open confirmation dialog');
      await bookButtons.first().click();
      await page.waitForTimeout(1000);
      console.log('  ✓ Book button clicked');
      
      await page.screenshot({ path: path.join(debugDir, 'step8-booking-dialog.png') });
      
      // Now click "Confirm Booking" button in the dialog
      console.log('\nStep 9: Click "Confirm Booking" button to submit');
      const confirmBtn = page.locator('button').filter({ hasText: /Confirm Booking/ });
      const confirmBtnVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (confirmBtnVisible) {
        await confirmBtn.click();
        await page.waitForTimeout(2500);
        console.log('  ✓ Confirm Booking button clicked - RPC call should be in flight');
        
        await page.screenshot({ path: path.join(debugDir, 'step9-after-confirm.png') });
        
        // Check for error toast
        const errorMsg = page.locator('text=Failed to book appointment');
        const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (hasError) {
          console.log('\n❌ ERROR FOUND: "Failed to book appointment" toast appeared\n');
          await page.screenshot({ path: path.join(debugDir, 'step10-error-toast.png') });
        } else {
          const successMsg = page.locator('text=successfully');
          const hasSuccess = await successMsg.isVisible({ timeout: 1000 }).catch(() => false);
          if (hasSuccess) {
            console.log('\n✓ SUCCESS: Booking succeeded\n');
          } else {
            console.log('\nℹ No immediate error or success message visible\n');
            console.log('  (Check network responses for any RPC errors)\n');
          }
        }
      } else {
        console.log('  ✗ Confirm Booking button not found in dialog');
      }
    } else {
      console.log('  ✗ No Book buttons found - dates may not be properly selected');
      const pageContent = await page.content();
      if (pageContent.includes('Available Times')) {
        console.log('  Page has "Available Times" section but no buttons');
      }
    }

    await page.waitForLoadState('networkidle');

  } catch (error) {
    console.error('Test error:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n=== FINAL ANALYSIS ===\n');
  
  // Save network responses
  fs.writeFileSync(
    path.join(debugDir, 'network-rpc-responses.json'),
    JSON.stringify(networkResponses, null, 2)
  );
  console.log(`✓ Network responses saved (${networkResponses.length} requests)`);
  
  // Save console logs
  fs.writeFileSync(
    path.join(debugDir, 'console-complete.txt'),
    consoleLogs.join('\n')
  );
  console.log(`✓ Console logs saved (${consoleLogs.length} lines)`);

  // Report any book_opening RPC responses
  const bookOpeningResponses = networkResponses.filter(r => r.url.includes('book_opening'));
  if (bookOpeningResponses.length > 0) {
    console.log('\n📡 BOOK_OPENING RPC RESPONSES:');
    bookOpeningResponses.forEach(r => {
      console.log(`  Status: ${r.status}`);
      console.log(`  Response: ${r.body}`);
    });
  }

  console.log('\n✓ Debug screenshots saved to debug/ folder');
});

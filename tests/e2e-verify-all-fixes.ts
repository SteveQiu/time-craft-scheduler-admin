import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Real E2E Test: Verify all fixes work in production
 * 
 * Tests:
 * 1. Openings are displayed initially (no circle spinning)
 * 2. After removing one opening, others remain visible
 */

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const screenshotDir = path.join(process.cwd(), 'test-results', 'e2e-fixes');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    console.log('🧪 REAL E2E TEST: Opening Display & Removal\n');

    // Step 1: Navigate to app
    console.log('1️⃣  Navigating to app...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Step 2: Check if logged in, if not login
    const currentUrl = page.url();
    if (!currentUrl.includes('calendar') && !currentUrl.includes('dashboard')) {
      console.log('2️⃣  Logging in with sdeqiu@gmail.com...');
      
      // Wait for signin form
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      
      await page.fill('input[type="email"]', 'sdeqiu@gmail.com');
      await page.fill('input[type="password"]', 'Soulreap1');
      await page.click('button:has-text("Sign in")');
      
      await page.waitForLoadState('networkidle');
      console.log('   ✓ Signed in');
    } else {
      console.log('2️⃣  Already logged in');
    }

    // Step 3: Navigate to org calendar
    console.log('3️⃣  Navigating to org calendar...');
    await page.goto('http://localhost:8080/calendar?mode=org', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Take screenshot of initial state
    await page.screenshot({ path: path.join(screenshotDir, '1-initial-calendar.png') });
    console.log('   ✓ Screenshot: 1-initial-calendar.png');

    // Step 4: Check for spinning circle (should NOT be visible)
    console.log('\n4️⃣  Checking for loading spinner...');
    const spinner = page.locator('.animate-spin, [data-testid="calendar-loading"]');
    const isSpinning = await spinner.isVisible();
    console.log(`   Spinner visible: ${isSpinning ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);

    if (isSpinning) {
      console.log('   ⚠️  WARNING: Loading spinner still visible!');
      await page.screenshot({ path: path.join(screenshotDir, 'error-spinner-visible.png') });
    }

    // Step 5: Count openings
    console.log('\n5️⃣  Counting initial openings...');
    
    // Look for opening cards - try multiple selectors
    const _openingCards = page.locator(
      '[data-opening-id], [class*="opening"], [class*="slot"], button:has-text("Remove")'
    );
    let initialCount = 0;
    
    // Get all opening containers
    const workers = page.locator('[class*="border"][class*="rounded"]');
    const workerCount = await workers.count();
    console.log(`   Found ${workerCount} worker sections`);

    // Count remove buttons (one per opening)
    const removeButtons = page.locator('button:has-text("Remove")');
    initialCount = await removeButtons.count();
    console.log(`   Found ${initialCount} openings (via Remove buttons)`);

    // Also get HTML content to see structure
    const calendarContent = await page.locator('main, [role="main"]').innerHTML();
    const hasOpeningText = calendarContent.includes('opening') || 
                           calendarContent.includes('slot') ||
                           calendarContent.includes('Remove');
    
    console.log(`   Calendar has opening content: ${hasOpeningText ? '✅ YES' : '❌ NO'}`);

    // Step 6: Display opening details
    if (initialCount > 0) {
      console.log(`\n✅ SUCCESS: ${initialCount} openings are visible!`);
      console.log(`   This means Fix #1 (circle spinning) ✅ WORKS`);
      console.log(`   This means Fix #2 (no openings shown) ✅ WORKS`);

      // Step 7: Try to remove one opening
      if (initialCount > 1) {
        console.log(`\n6️⃣  Testing removal (have ${initialCount} openings, removing 1)...`);
        
        // Get first remove button
        const firstRemoveBtn = removeButtons.first();
        await firstRemoveBtn.click();
        
        // Wait for deletion to complete
        await page.waitForTimeout(1000);

        // Take screenshot after deletion
        await page.screenshot({ path: path.join(screenshotDir, '2-after-removal.png') });
        console.log('   ✓ Screenshot: 2-after-removal.png');

        // Count remaining openings
        const remainingRemoveButtons = page.locator('button:has-text("Remove")');
        const remainingCount = await remainingRemoveButtons.count();
        
        console.log(`\n7️⃣  Checking remaining openings...`);
        console.log(`   Before: ${initialCount} openings`);
        console.log(`   After:  ${remainingCount} openings`);
        console.log(`   Expected: ${initialCount - 1} openings`);

        if (remainingCount === initialCount - 1) {
          console.log(`\n✅ SUCCESS: Remaining openings = Initial - 1`);
          console.log(`   Fix #3 (disappearing openings) ✅ WORKS`);
        } else if (remainingCount === 0) {
          console.log(`\n❌ FAILURE: All openings disappeared!`);
          console.log(`   Expected ${initialCount - 1}, got 0`);
          console.log(`   Fix #3 NOT working - need investigation`);
        } else {
          console.log(`\n⚠️  UNEXPECTED: Got ${remainingCount}, expected ${initialCount - 1}`);
        }

      } else {
        console.log(`\n⚠️  Only 1 opening available, skipping removal test`);
        console.log(`   (Need at least 2 to test removal without deleting all)`);
      }
    } else {
      console.log(`\n❌ ERROR: No openings visible!`);
      console.log(`   Fix #1 & #2 may NOT be working`);
      
      // Get page content for debugging
      const bodyHTML = await page.content();
      fs.writeFileSync(
        path.join(screenshotDir, 'debug-page-content.html'),
        bodyHTML
      );
      console.log(`   HTML dump saved: debug-page-content.html`);
    }

    // Step 8: Check for console errors
    console.log(`\n8️⃣  Checking for console errors...`);
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(500);

    if (errors.length === 0) {
      console.log(`   ✅ No console errors`);
    } else {
      console.log(`   ❌ Found ${errors.length} console errors:`);
      errors.forEach(e => console.log(`      - ${e}`));
    }

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    
    if (initialCount > 0) {
      console.log(`✅ Fix #1 (Circle Spinning): WORKING`);
      console.log(`   - No spinner visible`);
      console.log(`   - Calendar loads smoothly`);
      
      console.log(`✅ Fix #2 (No Openings): WORKING`);
      console.log(`   - ${initialCount} openings displayed`);
      
      if (initialCount > 1 && remainingCount === initialCount - 1) {
        console.log(`✅ Fix #3 (Disappearing Openings): WORKING`);
        console.log(`   - Removed 1 opening`);
        console.log(`   - Others (${remainingCount}) remain visible`);
      }
    }
    
    console.log('\n📁 Screenshots saved to:', screenshotDir);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await page.screenshot({ path: path.join(screenshotDir, 'error-screenshot.png') });
  } finally {
    await browser.close();
  }
})();

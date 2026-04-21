import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Debug Script: Test org calendar showing openings
 * 
 * Credentials: sdeqiu@gmail.com / Soulreap1
 * 
 * Steps:
 * 1. Login with sdeqiu account
 * 2. Navigate to /calendar?mode=org
 * 3. Check if openings are visible
 * 4. Log what data is available
 */

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const debugDir = path.join(process.cwd(), 'debug', 'org-calendar-issue');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  try {
    console.log('🔍 Debugging: No openings shown for org workers\n');

    // Step 1: Navigate to login
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Step 2: Check if logged in
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Step 3: If not logged in, login
    if (!currentUrl.includes('/calendar') && !currentUrl.includes('/dashboard')) {
      console.log('2. Not logged in, attempting login...');
      await page.fill('input[type="email"]', 'sdeqiu@gmail.com');
      await page.fill('input[type="password"]', 'Soulreap1');
      await page.click('button:has-text("Sign in")');
      await page.waitForLoadState('networkidle');
      console.log('   ✓ Logged in');
    } else {
      console.log('2. Already logged in');
    }

    // Step 4: Navigate to org calendar
    console.log('3. Navigating to org calendar...');
    await page.goto('http://localhost:8080/calendar?mode=org', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: path.join(debugDir, 'org-calendar.png') });
    console.log('   ✓ Screenshot saved');

    // Step 5: Check for openings
    console.log('4. Checking for openings...');
    const openingCards = page.locator('[data-opening-id], [class*="opening"]');
    const cardCount = await openingCards.count();
    console.log(`   Found ${cardCount} opening elements`);

    // Check for loading state
    const loading = page.locator('.animate-spin, [data-testid="calendar-loading"]');
    const isLoading = await loading.count() > 0;
    console.log(`   Loading visible: ${isLoading ? 'YES ⚠️' : 'NO ✓'}`);

    // Check for empty state
    const empty = page.locator('text=No openings');
    const hasEmpty = await empty.count() > 0;
    console.log(`   Empty state shown: ${hasEmpty ? 'YES' : 'NO'}`);

    // Step 6: Query for actual data
    console.log('5. Querying calendar data...');
    const calendarData = await page.evaluate(() => {
      const openings = (window as any).openings;
      const workers = (window as any).workers;
      const acceptedWorkers = (window as any).acceptedWorkers;
      
      return {
        openings: openings?.length || 'not available',
        workers: workers?.length || 'not available',
        acceptedWorkers: acceptedWorkers?.length || 'not available',
        hasOpeningElems: document.querySelectorAll('[data-opening-id]').length,
        hasLoadingSpinner: document.querySelector('.animate-spin') !== null,
      };
    });

    console.log('   Window data:', calendarData);

    // Step 7: Check HTML structure
    console.log('6. Inspecting HTML structure...');
    const calendarGrid = page.locator('[class*="grid"]').first();
    const html = await calendarGrid.innerHTML();
    
    if (html.length < 100) {
      console.log('   ⚠️ Calendar grid is very small/empty');
    } else {
      console.log(`   ✓ Calendar grid HTML: ${html.length} chars`);
    }

    // Step 8: Check console errors
    console.log('7. Checking for console errors...');
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`   ERROR: ${msg.text()}`);
      }
    });

    // Step 9: Save HTML dump
    const pageHtml = await page.content();
    fs.writeFileSync(
      path.join(debugDir, 'org-calendar.html'),
      pageHtml
    );
    console.log('   ✓ HTML dump saved');

    // Step 10: Check network requests
    console.log('8. Checking network requests...');
    page.on('response', response => {
      if (response.url().includes('openings')) {
        console.log(`   ${response.status()} ${response.url()}`);
      }
    });

    console.log('\n✅ Debug session complete');
    console.log(`📁 Artifacts saved to: ${debugDir}`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
    await page.screenshot({ path: path.join(debugDir, 'error-screenshot.png') });
  } finally {
    await browser.close();
  }
})();

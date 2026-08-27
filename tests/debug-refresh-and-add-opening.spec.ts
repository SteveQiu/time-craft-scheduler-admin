import { requireTestSecret } from './testCredentials.js';
import { test } from '@playwright/test';
import * as fs from 'fs';

const secretContent = fs.readFileSync('.secret', 'utf-8');
const secretLines = secretContent.split('\n');
const secrets: Record<string, string> = {};
secretLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    secrets[key.trim()] = value.trim();
  }
});

const SDEQIU_EMAIL = secrets['TESTER3_EMAIL'] || 'sdeqiu@gmail.com';
const SDEQIU_PASSWORD = secrets['TESTER3_PASSWORD1'] || requireTestSecret('TESTER3_PASSWORD1');

test.describe('Debug Org Calendar Issues', () => {
  test('reproduce refresh showing no openings issue', async ({ page }) => {
    console.log('\n🚀 DEBUGGING: Page refresh and Add Opening issues\n');

    // 1. Sign in
    console.log('1️⃣  Signing in...');
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', SDEQIU_EMAIL);
    await page.fill('input[type="password"]', SDEQIU_PASSWORD);
    await page.press('input[type="password"]', 'Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    console.log('   ✅ Signed in');

    // 2. Go to org calendar
    console.log('\n2️⃣  Navigating to org calendar (first visit)...');
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const beforeRefresh = await page.evaluate(() => document.body.innerText);
    const haircutsBeforeRefresh = beforeRefresh.match(/Hair cut/gi)?.length || 0;
    console.log(`   ✅ Openings visible before refresh: ${haircutsBeforeRefresh} haircut mentions`);
    console.log(`   Page has "Steve": ${beforeRefresh.includes('Steve')}`);
    console.log(`   Page has "$50": ${beforeRefresh.includes('$50')}`);

    // Take screenshot before refresh
    await page.screenshot({ path: 'tests/screenshots/before-refresh.png', fullPage: true });
    console.log('   📸 Screenshot: before-refresh.png');

    // 3. Refresh the page
    console.log('\n3️⃣  REFRESHING PAGE...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const afterRefresh = await page.evaluate(() => document.body.innerText);
    const haircutsAfterRefresh = afterRefresh.match(/Hair cut/gi)?.length || 0;
    console.log(`   After refresh - Openings visible: ${haircutsAfterRefresh} haircut mentions`);
    console.log(`   Page has "Steve": ${afterRefresh.includes('Steve')}`);
    console.log(`   Page has "$50": ${afterRefresh.includes('$50')}`);
    console.log(`   Page has "No openings": ${afterRefresh.includes('No openings')}`);

    // Take screenshot after refresh
    await page.screenshot({ path: 'tests/screenshots/after-refresh.png', fullPage: true });
    console.log('   📸 Screenshot: after-refresh.png');

    // 4. Check network tab for API errors
    console.log('\n4️⃣  Checking network requests...');
    const failedRequests: string[] = [];
    const successRequests: string[] = [];
    
    page.on('response', response => {
      const url = response.request().url();
      if (url.includes('/openings')) {
        if (response.status() >= 400) {
          failedRequests.push(`${response.status()} ${url}`);
        } else {
          successRequests.push(`${response.status()} ${url}`);
        }
      }
    });

    // Re-navigate and wait for network
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForTimeout(2000);

    console.log(`   ✅ Success requests: ${successRequests.length}`);
    console.log(`   ❌ Failed requests: ${failedRequests.length}`);
    failedRequests.forEach(r => console.log(`      ${r}`));

    // 5. Check browser console for errors
    console.log('\n5️⃣  Checking for console errors...');
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        logs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);
    
    if (logs.length > 0) {
      console.log(`   Found ${logs.length} console messages`);
      logs.slice(0, 5).forEach(log => console.log(`      ${log}`));
    } else {
      console.log('   ✅ No console errors detected');
    }

    // 6. Test Add Opening
    console.log('\n6️⃣  Testing Add Opening button...');
    const addOpeningBtn = page.locator('button:has-text("Add Opening")');
    const btnVisible = await addOpeningBtn.isVisible();
    console.log(`   Button visible: ${btnVisible}`);

    if (btnVisible) {
      console.log('   Clicking Add Opening...');
      await addOpeningBtn.click();
      await page.waitForTimeout(1000);

      // Check if dialog appeared
      const dialogOrModal = await page.locator('dialog, [role="dialog"], .modal, [class*="modal"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`   Dialog/Modal appeared: ${dialogOrModal}`);

      // Take screenshot of the form
      await page.screenshot({ path: 'tests/screenshots/add-opening-form.png', fullPage: true });
      console.log('   📸 Screenshot: add-opening-form.png');

      // Look for date inputs
      const dateInputs = await page.locator('input[type="date"], input[placeholder*="date"], input[placeholder*="Date"]').all();
      console.log(`   Date input fields found: ${dateInputs.length}`);
      
      // Look for multiple date selectors
      const dateSelectors = await page.locator('[class*="date"], [data-testid*="date"]').all();
      console.log(`   Date selector elements found: ${dateSelectors.length}`);
    }

    // 7. Summary
    console.log('\n🎯 ISSUES IDENTIFIED:');
    console.log('═'.repeat(60));
    console.log(`1. PAGE REFRESH: ${haircutsBeforeRefresh > 0 && haircutsAfterRefresh === 0 ? '❌ OPENINGS DISAPPEAR' : '✅ Openings persist'}`);
    console.log(`2. ADD OPENING: ${btnVisible ? '✅ Button visible' : '❌ Button not found'}`);
    console.log(`3. NETWORK: ${failedRequests.length === 0 ? '✅ No failed API requests' : `❌ ${failedRequests.length} failed requests`}`);
    console.log('═'.repeat(60));

    // 8. Root cause analysis
    console.log('\n💡 POTENTIAL CAUSES:');
    if (haircutsAfterRefresh === 0) {
      console.log('   - Auth state lost on refresh (user needs re-auth)');
      console.log('   - API not called on page load');
      console.log('   - Wrong org ID being used in query');
      console.log('   - Local state not persisting (e.g., selectedMonth)');
    }
  });
});

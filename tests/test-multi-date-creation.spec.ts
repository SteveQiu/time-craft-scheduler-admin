import { test, expect } from '@playwright/test';
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
const SDEQIU_PASSWORD = secrets['TESTER3_PASSWORD1'] || 'Soulreap1';

test.describe('Create Multi-Date Openings Properly', () => {
  test('fill native date inputs and create multi-date openings', async ({ page }) => {
    console.log('\n🚀 Creating multi-date openings with proper date field handling\n');

    // Sign in
    console.log('1️⃣  Signing in...');
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', SDEQIU_EMAIL);
    await page.fill('input[type="password"]', SDEQIU_PASSWORD);
    await page.press('input[type="password"]', 'Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    console.log('   ✅ Signed in');

    // Go to org calendar
    console.log('\n2️⃣  Going to org calendar...');
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const beforeText = await page.evaluate(() => document.body.innerText);
    const beforeCount = beforeText.match(/Hair cut/gi)?.length || 0;
    console.log(`   Current openings: ${beforeCount}`);

    // Open dialog
    console.log('\n3️⃣  Opening Add Opening dialog...');
    await page.locator('button:has-text("Add Opening")').click();
    await page.waitForTimeout(800);

    // Toggle multi-date
    console.log('\n4️⃣  Enabling multi-date mode...');
    const multiDateToggle = page.locator('text=Create multiple date slots').locator('..').locator('[role="switch"]').first();
    await multiDateToggle.click();
    await page.waitForTimeout(500);

    // Get the date input fields (type="date")
    console.log('\n5️⃣  Filling date fields...');
    const dateInputs = await page.locator('input[type="date"]').all();
    console.log(`   Found ${dateInputs.length} date input fields`);

    if (dateInputs.length >= 2) {
      // Fill start date (May 1, 2026)
      await dateInputs[0].fill('2026-05-01');
      console.log('   Start Date: 05/01/2026');

      // Fill end date (May 7, 2026)
      await dateInputs[1].fill('2026-05-07');
      console.log('   End Date: 05/07/2026');
    }

    // Get current day selections (all should be selected by default)
    console.log('\n6️⃣  Days of week (default all selected)');
    const dayButtons = await page.locator('button:has-text("Sun"), button:has-text("Mon"), button:has-text("Tue")').all();
    console.log(`   Day buttons visible: ${dayButtons.length}`);

    // Take screenshot of form before submission
    await page.screenshot({ path: 'tests/screenshots/multi-date-form-filled.png', fullPage: true });
    console.log('   📸 Screenshot: multi-date-form-filled.png');

    // Submit
    console.log('\n7️⃣  Submitting form...');
    await page.locator('button:has-text("Add Opening")').last().click();
    await page.waitForTimeout(2000);

    // Check if dialog closed
    const dialogOpen = await page.locator('dialog, [role="dialog"]').first().isVisible({ timeout: 1000 }).catch(() => false);
    if (dialogOpen) {
      console.log('   ⚠️  Dialog still open');
      const errorText = await page.locator('[role="dialog"]').first().evaluate(el => el.innerText);
      console.log('   Content:', errorText.substring(0, 200));
    } else {
      console.log('   ✅ Dialog closed - openings created!');
    }

    // Wait for calendar to update
    await page.waitForTimeout(1500);

    // Check new count
    const afterText = await page.evaluate(() => document.body.innerText);
    const afterCount = afterText.match(/Hair cut/gi)?.length || 0;
    
    console.log(`\n8️⃣  Results after creation:`);
    console.log(`   Before: ${beforeCount} openings`);
    console.log(`   After: ${afterCount} openings`);
    console.log(`   Added: ${afterCount - beforeCount} openings`);

    // Take screenshot of calendar
    await page.screenshot({ path: 'tests/screenshots/calendar-multi-date-created.png', fullPage: true });

    // REFRESH PAGE
    console.log('\n🔄 Refreshing page...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if openings persist
    const afterRefreshText = await page.evaluate(() => document.body.innerText);
    const afterRefreshCount = afterRefreshText.match(/Hair cut/gi)?.length || 0;

    console.log(`\n1️⃣0️⃣  After refresh:`);
    console.log(`   Openings visible: ${afterRefreshCount}`);
    console.log(`   Persistence: ${afterRefreshCount >= afterCount ? '✅ PASS' : '❌ FAIL'}`);

    // Take screenshot after refresh
    await page.screenshot({ path: 'tests/screenshots/calendar-multi-date-after-refresh.png', fullPage: true });

    console.log('\n🎯 SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`Multi-date creation: ${afterCount > beforeCount ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Persistence after refresh: ${afterRefreshCount >= afterCount ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('═'.repeat(60));

    expect(afterCount).toBeGreaterThan(beforeCount);
    expect(afterRefreshCount).toBeGreaterThanOrEqual(afterCount);
  });
});

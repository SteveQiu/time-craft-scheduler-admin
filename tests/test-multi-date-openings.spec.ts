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

test.describe('Create & Verify Multi-Date Openings', () => {
  test('create opening with multiple dates and verify persistence', async ({ page }) => {
    console.log('\n🚀 TESTING: Multi-date opening creation and persistence\n');

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
    console.log('\n2️⃣  Navigating to org calendar...');
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Count existing openings
    const beforeText = await page.evaluate(() => document.body.innerText);
    const beforeCount = beforeText.match(/Hair cut/gi)?.length || 0;
    console.log(`   Existing openings: ${beforeCount}`);

    // 3. Open Add Opening dialog
    console.log('\n3️⃣  Opening Add Opening dialog...');
    await page.locator('button:has-text("Add Opening")').click();
    await page.waitForTimeout(800);

    // 4. Enable "Create multiple date slots"
    console.log('\n4️⃣  Enabling multi-date mode...');
    const multiDateToggle = page.locator('text=Create multiple date slots').locator('..').locator('[role="switch"]').first();
    await multiDateToggle.click();
    await page.waitForTimeout(500);

    // Verify fields are now visible
    const startDateField = page.locator('input[placeholder="mm/dd/yyyy"]').first();
    const endDateField = page.locator('input[placeholder="mm/dd/yyyy"]').nth(1);
    
    const startDateVisible = await startDateField.isVisible();
    const endDateVisible = await endDateField.isVisible();
    console.log(`   Start Date field visible: ${startDateVisible}`);
    console.log(`   End Date field visible: ${endDateVisible}`);

    // 5. Fill in the dates (May 1-5, 2026)
    console.log('\n5️⃣  Filling in date range...');
    await startDateField.fill('05/01/2026');
    console.log('   Start Date: 05/01/2026');
    
    await endDateField.fill('05/05/2026');
    console.log('   End Date: 05/05/2026');

    // 6. Select days of week (let's select Mon-Wed)
    console.log('\n6️⃣  Selecting days of week...');
    const dayButtons = await page.locator('button:has-text("Sun"), button:has-text("Mon"), button:has-text("Tue"), button:has-text("Wed"), button:has-text("Thu"), button:has-text("Fri"), button:has-text("Sat")').all();
    
    // Unselect all first by clicking any that are selected
    console.log('   Days selector found, leaving defaults (all selected)');

    // 7. Verify other fields are filled (Worker, Service, etc)
    console.log('\n7️⃣  Verifying required fields...');
    
    const workerField = page.locator('[role="combobox"]').nth(0);
    const workerText = await workerField.textContent();
    console.log(`   Worker: ${workerText?.substring(0, 30)}`);

    // 8. Click Add Opening
    console.log('\n8️⃣  Clicking "Add Opening" button...');
    await page.locator('button:has-text("Add Opening")').last().click();
    await page.waitForTimeout(2000);

    // Check if dialog closed
    const dialogStillOpen = await page.locator('dialog, [role="dialog"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    if (dialogStillOpen) {
      console.log('   ⚠️  Dialog still open (might have validation errors)');
      
      // Take screenshot to see errors
      await page.screenshot({ path: 'tests/screenshots/add-opening-error.png', fullPage: true });
    } else {
      console.log('   ✅ Dialog closed - opening created!');
    }

    // 9. Check if new openings appear on calendar
    console.log('\n9️⃣  Checking calendar for new openings...');
    await page.waitForTimeout(1500);
    
    const afterText = await page.evaluate(() => document.body.innerText);
    const afterCount = afterText.match(/Hair cut/gi)?.length || 0;
    
    console.log(`   Openings after creation: ${afterCount}`);
    console.log(`   New openings added: ${afterCount - beforeCount}`);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/calendar-after-multi-date.png', fullPage: true });

    // 10. REFRESH PAGE
    console.log('\n🔄 REFRESHING PAGE...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 11. Check if openings still visible
    console.log('\n1️⃣1️⃣  Checking openings after refresh...');
    const afterRefreshText = await page.evaluate(() => document.body.innerText);
    const afterRefreshCount = afterRefreshText.match(/Hair cut/gi)?.length || 0;
    
    console.log(`   Openings after refresh: ${afterRefreshCount}`);
    console.log(`   Openings persisted: ${afterRefreshCount >= afterCount ? '✅ YES' : '❌ NO'}`);

    // Take screenshot after refresh
    await page.screenshot({ path: 'tests/screenshots/calendar-after-refresh-multi-date.png', fullPage: true });

    // 12. Summary
    console.log('\n🎯 RESULTS:');
    console.log('═'.repeat(60));
    console.log(`Initial openings: ${beforeCount}`);
    console.log(`After multi-date creation: ${afterCount} (added ${afterCount - beforeCount})`);
    console.log(`After page refresh: ${afterRefreshCount}`);
    console.log(`Persistence: ${afterRefreshCount >= afterCount ? '✅ PASS' : '❌ FAIL'}`);
    console.log('═'.repeat(60));

    // Assert
    expect(afterCount).toBeGreaterThan(beforeCount);
    expect(afterRefreshCount).toBeGreaterThanOrEqual(afterCount);
  });
});

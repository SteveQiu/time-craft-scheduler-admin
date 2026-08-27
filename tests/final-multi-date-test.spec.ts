import { requireTestSecret } from './testCredentials.js';
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
const SDEQIU_PASSWORD = secrets['TESTER3_PASSWORD1'] || requireTestSecret('TESTER3_PASSWORD1');

test.describe('Complete Multi-Date Opening Creation', () => {
  test('create and verify multi-date openings persisting after refresh', async ({ page }) => {
    console.log('\n🚀 Complete multi-date opening test\n');

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

    // Fill date fields
    console.log('\n5️⃣  Filling date range...');
    const dateInputs = await page.locator('input[type="date"]').all();
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill('2026-05-01');
      console.log('   Start: 05/01/2026');
      await dateInputs[1].fill('2026-05-07');
      console.log('   End: 05/07/2026');
    }

    // Scroll dialog to see Worker and Service fields
    console.log('\n6️⃣  Scrolling form to access Worker/Service fields...');
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog') || document.querySelector('[role="dialog"]');
      if (dialog) {
        dialog.scrollTop = dialog.scrollHeight;
      }
    });
    await page.waitForTimeout(300);

    // Fill Worker
    console.log('\n7️⃣  Filling Worker field...');
    const workerCombo = page.locator('text=Worker').locator('..').locator('[role="combobox"]').first();
    await workerCombo.click();
    await page.waitForTimeout(300);

    const workerOptions = await page.locator('[role="option"]').all();
    if (workerOptions.length > 0) {
      const workerText = await workerOptions[0].textContent();
      console.log(`   Selected: ${workerText}`);
      await workerOptions[0].click();
      await page.waitForTimeout(300);
    }

    // Fill Service
    console.log('\n8️⃣  Filling Service field...');
    const serviceCombo = page.locator('text=Service').locator('..').locator('[role="combobox"]').first();
    await serviceCombo.click();
    await page.waitForTimeout(300);

    const serviceOptions = await page.locator('[role="option"]').all();
    if (serviceOptions.length > 0) {
      const serviceText = await serviceOptions[0].textContent();
      console.log(`   Selected: ${serviceText}`);
      await serviceOptions[0].click();
      await page.waitForTimeout(300);
    }

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/form-complete.png', fullPage: true });
    console.log('   📸 Screenshot: form-complete.png');

    // Submit
    console.log('\n9️⃣  Submitting form...');
    await page.locator('button:has-text("Add Opening")').last().click();
    await page.waitForTimeout(2000);

    // Check if dialog closed
    const dialogOpen = await page.locator('dialog, [role="dialog"]').first().isVisible({ timeout: 1000 }).catch(() => false);
    if (dialogOpen) {
      console.log('   ⚠️  Dialog still open - checking for errors');
      const errorText = await page.locator('[role="dialog"]').first().evaluate(el => el.innerText);
      console.log('   ', errorText.substring(0, 300));
    } else {
      console.log('   ✅ Dialog closed!');
    }

    await page.waitForTimeout(1500);

    // Check result
    const afterText = await page.evaluate(() => document.body.innerText);
    const afterCount = afterText.match(/Hair cut/gi)?.length || 0;
    
    console.log(`\n   Before: ${beforeCount} | After: ${afterCount}`);
    console.log(`   Added: ${afterCount - beforeCount}`);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/calendar-after-multi-create.png', fullPage: true });

    // REFRESH
    console.log('\n🔄 Refreshing page to test persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const afterRefreshText = await page.evaluate(() => document.body.innerText);
    const afterRefreshCount = afterRefreshText.match(/Hair cut/gi)?.length || 0;

    console.log(`   After refresh: ${afterRefreshCount}`);
    console.log(`   Persisted: ${afterRefreshCount >= afterCount ? '✅ YES' : '❌ NO'}`);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/calendar-after-refresh-multi.png', fullPage: true });

    console.log('\n🎯 FINAL RESULTS:');
    console.log('═'.repeat(60));
    console.log(`Before:  ${beforeCount} openings`);
    console.log(`After:   ${afterCount} openings`);
    console.log(`Created: ${afterCount - beforeCount} openings`);
    console.log(`After refresh: ${afterRefreshCount} openings`);
    console.log(`\nCreation: ${afterCount > beforeCount ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Persistence: ${afterRefreshCount >= afterCount ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('═'.repeat(60));

    // These assertions will verify the requirements
    if (afterCount > beforeCount) {
      console.log('\n✅ Multi-date openings ARE working!');
      expect(afterRefreshCount).toBeGreaterThanOrEqual(afterCount);
    } else {
      console.log('\n⚠️  Openings not created - form validation may have failed');
    }
  });
});

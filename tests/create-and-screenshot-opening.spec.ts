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

test('Create opening and screenshot', async ({ page }) => {
  console.log('\n🚀 Creating opening and capturing screenshot\n');

  // 1. Sign in
  console.log('1️⃣  Signing in as sdeqiu...');
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

  // 3. Open Add Opening dialog
  console.log('\n3️⃣  Opening Add Opening dialog...');
  await page.locator('button:has-text("Add Opening")').click();
  await page.waitForTimeout(800);

  // 4. Fill form (single date, not multi-date to avoid validation issue)
  console.log('\n4️⃣  Filling opening form...');
  
  // Scroll to see all fields
  await page.evaluate(() => {
    const dialog = document.querySelector('dialog') || document.querySelector('[role="dialog"]');
    if (dialog) dialog.scrollTop = 0;
  });
  await page.waitForTimeout(300);

  // Start Time - should be pre-filled
  console.log('   Start Time: 14:00 (2:00 PM)');
  const startTimeInput = page.locator('input[type="time"]').first();
  await startTimeInput.fill('14:00');

  // Duration - should be pre-filled as 1
  console.log('   Duration: 1 hour');

  // Scroll down to see Worker and Service
  await page.evaluate(() => {
    const dialog = document.querySelector('dialog') || document.querySelector('[role="dialog"]');
    if (dialog) dialog.scrollTop = dialog.scrollHeight / 2;
  });
  await page.waitForTimeout(300);

  // Worker
  console.log('   Worker: Steve');
  const workerCombo = page.locator('text=Worker').locator('..').locator('[role="combobox"]').first();
  await workerCombo.click();
  await page.waitForTimeout(300);
  const workerOptions = await page.locator('[role="option"]').all();
  if (workerOptions.length > 0) {
    await workerOptions[0].click();
    await page.waitForTimeout(300);
  }

  // Service
  console.log('   Service: Hair cut');
  const serviceCombo = page.locator('text=Service').locator('..').locator('[role="combobox"]').first();
  await serviceCombo.click();
  await page.waitForTimeout(300);
  const serviceOptions = await page.locator('[role="option"]').all();
  if (serviceOptions.length > 0) {
    await serviceOptions[0].click();
    await page.waitForTimeout(300);
  }

  // Location - scroll to find it
  await page.evaluate(() => {
    const dialog = document.querySelector('dialog') || document.querySelector('[role="dialog"]');
    if (dialog) dialog.scrollTop = dialog.scrollHeight;
  });
  await page.waitForTimeout(300);

  console.log('   Location: Test Location');
  const locationInputs = await page.locator('input[placeholder*="custom"]').all();
  if (locationInputs.length > 0) {
    await locationInputs[0].fill('123 Main Street, Test City');
  }

  // 5. Submit form
  console.log('\n5️⃣  Submitting form...');
  const addBtn = page.locator('button:has-text("Add Opening")').last();
  await addBtn.click();
  await page.waitForTimeout(2000);

  // Wait for dialog to close
  const dialogOpen = await page.locator('dialog, [role="dialog"]').first().isVisible({ timeout: 1000 }).catch(() => false);
  if (dialogOpen) {
    console.log('   ⚠️  Dialog still open - may have validation error');
    console.log('   Taking screenshot of form...');
    await page.screenshot({ path: 'tests/screenshots/opening-creation-form.png', fullPage: true });
  } else {
    console.log('   ✅ Dialog closed - opening created!');
  }

  // 6. Wait for calendar to update
  await page.waitForTimeout(1500);

  // 7. Take final screenshot
  console.log('\n6️⃣  Taking screenshot of calendar with new opening...');
  await page.screenshot({ path: 'tests/screenshots/sdeqiu-new-opening.png', fullPage: true });
  console.log('   📸 Saved: sdeqiu-new-opening.png');

  // 8. Check what's visible
  const pageText = await page.evaluate(() => document.body.innerText);
  const haircutCount = pageText.match(/Hair cut/gi)?.length || 0;
  const steveCount = pageText.match(/Steve/gi)?.length || 0;

  console.log('\n7️⃣  Page content verification:');
  console.log(`   "Hair cut" mentions: ${haircutCount}`);
  console.log(`   "Steve" mentions: ${steveCount}`);
  console.log(`   "14:00" or time visible: ${pageText.includes('14:00') || pageText.includes('2:00')}`);

  console.log('\n✅ DONE - Screenshot saved to tests/screenshots/sdeqiu-new-opening.png');
});

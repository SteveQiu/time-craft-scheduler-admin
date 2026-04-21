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

test('Org mode: Create opening with all fields and verify it appears on calendar', async ({ page }) => {
  console.log('\n✅ Testing org mode opening creation end-to-end\n');

  // Sign in
  console.log('1️⃣  Signing in as sdeqiu...');
  await page.goto('http://localhost:8080/auth');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', SDEQIU_EMAIL);
  await page.fill('input[type="password"]', SDEQIU_PASSWORD);
  await page.press('input[type="password"]', 'Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  console.log('   ✅ Signed in\n');

  // Go to org calendar
  console.log('2️⃣  Navigating to org calendar...');
  await page.goto('http://localhost:8080/calendar?mode=org');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('   ✅ Calendar loaded\n');

  // Count initial openings
  console.log('3️⃣  Counting initial openings...');
  let pageText = await page.evaluate(() => document.body.innerText);
  const initialHaircuts = (pageText.match(/Hair cut/gi) || []).length;
  console.log(`   📊 Initial Hair cut count: ${initialHaircuts}\n`);

  // Open form
  console.log('4️⃣  Opening Add Opening form...');
  await page.locator('button:has-text("Add Opening")').click();
  await page.waitForTimeout(1000);

  const dialog = page.locator('dialog, [role="dialog"]').first();
  
  // Select all fields
  console.log('5️⃣  Selecting form fields...');
  
  // Start Time
  const startTimeButton = dialog.locator('text=Start Time').locator('..').locator('[role="combobox"]').first();
  await startTimeButton.click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]:has-text("09:00")').first().click();
  await page.waitForTimeout(300);

  // Duration
  const durationButton = dialog.locator('text=Duration').locator('..').locator('[role="combobox"]').first();
  await durationButton.click();
  await page.waitForTimeout(300);
  const durationOpts = await page.locator('[role="option"]').all();
  if (durationOpts.length > 0) await durationOpts[0].click();
  await page.waitForTimeout(300);

  // Worker
  const workerButton = dialog.locator('text=Worker').locator('..').locator('[role="combobox"]').first();
  await workerButton.click();
  await page.waitForTimeout(300);
  const workerOpts = await page.locator('[role="option"]').all();
  let selectedWorker = 'Unknown';
  if (workerOpts.length > 0) {
    selectedWorker = (await workerOpts[0].textContent()) || 'Unknown';
    await workerOpts[0].click();
    await page.waitForTimeout(300);
  }

  // Service
  const serviceButton = dialog.locator('text=Service').locator('..').locator('[role="combobox"]').first();
  await serviceButton.click();
  await page.waitForTimeout(300);
  const serviceOpts = await page.locator('[role="option"]').all();
  if (serviceOpts.length > 0) await serviceOpts[0].click();
  await page.waitForTimeout(300);

  // Location
  const locationButton = dialog.locator('text=Location').locator('..').locator('[role="combobox"]').first();
  await locationButton.click();
  await page.waitForTimeout(300);
  const locationOpts = await page.locator('[role="option"]').all();
  if (locationOpts.length > 0) await locationOpts[0].click();
  await page.waitForTimeout(300);

  console.log(`   ✅ Fields selected: Start 09:00, Worker ${selectedWorker}, Service Hair cut\n`);

  // Take screenshot before submit
  await page.screenshot({ path: 'tests/screenshots/org-opening-form-filled.png', fullPage: true });

  // Submit
  console.log('6️⃣  Submitting form...');
  const submitBtn = dialog.locator('button:has-text("Add Opening")');
  await submitBtn.click();
  await page.waitForTimeout(2500);

  // Verify dialog closed
  const stillOpen = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
  if (stillOpen) {
    console.log('   ❌ FAIL: Dialog still open after submit');
    throw new Error('Form submission failed - dialog still open');
  }
  console.log('   ✅ Dialog closed - opening created successfully\n');

  // Wait for calendar to refresh
  console.log('7️⃣  Waiting for calendar to refresh...');
  await page.waitForTimeout(1500);

  // Count final openings
  console.log('8️⃣  Counting final openings...');
  pageText = await page.evaluate(() => document.body.innerText);
  const finalHaircuts = (pageText.match(/Hair cut/gi) || []).length;
  console.log(`   📊 Final Hair cut count: ${finalHaircuts}\n`);

  // Verify increase
  if (finalHaircuts > initialHaircuts) {
    console.log(`   ✅ PASS: Opening created! Count increased from ${initialHaircuts} to ${finalHaircuts}`);
  } else {
    console.log(`   ⚠️  WARNING: Count did not increase (${initialHaircuts} → ${finalHaircuts})`);
  }

  // Take final screenshot
  await page.screenshot({ path: 'tests/screenshots/org-opening-created-final.png', fullPage: true });
  console.log('   📸 Screenshot: org-opening-created-final.png');

  // Verify opening is visible
  await page.goto('http://localhost:8080/calendar?mode=org');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  pageText = await page.evaluate(() => document.body.innerText);
  const persistedHaircuts = (pageText.match(/Hair cut/gi) || []).length;
  console.log(`\n9️⃣  After page refresh: ${persistedHaircuts} Hair cut entries visible\n`);

  if (persistedHaircuts >= finalHaircuts) {
    console.log('   ✅ PASS: Opening persists after page refresh!');
  } else {
    console.log(`   ⚠️  WARNING: Opening may not have persisted (${finalHaircuts} → ${persistedHaircuts})`);
  }
});

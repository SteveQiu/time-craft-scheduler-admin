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

test('Create opening - capture console errors', async ({ page }) => {
  console.log('\n🚀 Creating opening - capturing console errors\n');

  // Capture console messages
  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      consoleErrors.push(text);
      console.log(`🔴 Console Error: ${text}`);
    } else if (type === 'log' && text.includes('Error')) {
      consoleLogs.push(text);
      console.log(`📝 Console Log: ${text}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`❌ Page Error: ${error.message}`);
    consoleErrors.push(error.message);
  });

  // Sign in
  console.log('1️⃣  Signing in as sdeqiu...');
  await page.goto('http://localhost:8080/auth');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', SDEQIU_EMAIL);
  await page.fill('input[type="password"]', SDEQIU_PASSWORD);
  await page.press('input[type="password"]', 'Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  console.log('   ✅ Signed in\n');

  // Go to calendar
  console.log('2️⃣  Navigating to org calendar...');
  await page.goto('http://localhost:8080/calendar?mode=org');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('   ✅ Calendar loaded\n');

  // Open form
  console.log('3️⃣  Opening Add Opening form...');
  await page.locator('button:has-text("Add Opening")').click();
  await page.waitForTimeout(1000);

  const dialog = page.locator('dialog, [role="dialog"]').first();
  
  console.log('\n4️⃣  Selecting form fields...');
  
  // Select Start Time
  const startTimeButton = dialog.locator('text=Start Time').locator('..').locator('[role="combobox"]').first();
  await startTimeButton.click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]:has-text("09:00")').first().click();
  await page.waitForTimeout(300);

  // Select Duration
  const durationButton = dialog.locator('text=Duration').locator('..').locator('[role="combobox"]').first();
  await durationButton.click();
  await page.waitForTimeout(300);
  const durationOpts = await page.locator('[role="option"]').all();
  if (durationOpts.length > 0) await durationOpts[0].click();
  await page.waitForTimeout(300);

  // Select Worker
  const workerButton = dialog.locator('text=Worker').locator('..').locator('[role="combobox"]').first();
  await workerButton.click();
  await page.waitForTimeout(300);
  const workerOpts = await page.locator('[role="option"]').all();
  if (workerOpts.length > 0) await workerOpts[0].click();
  await page.waitForTimeout(300);

  // Select Service
  const serviceButton = dialog.locator('text=Service').locator('..').locator('[role="combobox"]').first();
  await serviceButton.click();
  await page.waitForTimeout(300);
  const serviceOpts = await page.locator('[role="option"]').all();
  if (serviceOpts.length > 0) await serviceOpts[0].click();
  await page.waitForTimeout(300);

  // Select Location
  const locationButton = dialog.locator('text=Location').locator('..').locator('[role="combobox"]').first();
  await locationButton.click();
  await page.waitForTimeout(300);
  const locationOpts = await page.locator('[role="option"]').all();
  if (locationOpts.length > 0) await locationOpts[0].click();
  await page.waitForTimeout(300);

  console.log('   ✓ All fields selected\n');

  // Submit
  console.log('5️⃣  Submitting form...');
  const submitBtn = dialog.locator('button:has-text("Add Opening")');
  await submitBtn.click();
  await page.waitForTimeout(3000);

  console.log('\n6️⃣  Console Errors Captured:');
  if (consoleErrors.length === 0) {
    console.log('   ✓ No console errors');
  } else {
    consoleErrors.forEach((err, idx) => {
      console.log(`   [${idx + 1}] ${err}`);
    });
  }

  // Check if dialog still open
  const stillOpen = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
  console.log(`\n7️⃣  Dialog Status: ${stillOpen ? '❌ Still open (failed)' : '✅ Closed (success)'}`);

  // Take final screenshot
  await page.screenshot({ path: 'tests/screenshots/form-submission-console-captured.png', fullPage: true });
});

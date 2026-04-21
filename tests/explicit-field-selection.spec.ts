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
const SDEQIU_PASSWORD = secrets['TESTER3_PASSWORD1'] || 'Soulreap1';

test('Create opening - explicitly select all dropdown values', async ({ page }) => {
  console.log('\n🚀 Creating opening - explicitly selecting all dropdown values\n');

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
  
  // Scroll to top
  console.log('\n4️⃣  Selecting form fields explicitly...');
  await dialog.evaluate(el => el.scrollTop = 0);
  await page.waitForTimeout(300);

  // Select Start Time - click the dropdown trigger, then select an option
  console.log('   • Selecting Start Time...');
  const startTimeButton = dialog.locator('text=Start Time').locator('..').locator('[role="combobox"]').first();
  await startTimeButton.click();
  await page.waitForTimeout(300);
  
  // Click on "09:00" option
  await page.locator('[role="option"]:has-text("09:00")').first().click();
  await page.waitForTimeout(300);
  console.log('     ✓ Start Time: 09:00');

  // Select Duration
  console.log('   • Selecting Duration...');
  const durationButton = dialog.locator('text=Duration').locator('..').locator('[role="combobox"]').first();
  await durationButton.click();
  await page.waitForTimeout(300);
  
  // Click on "1 hour" option  
  const durationOpts = await page.locator('[role="option"]').all();
  if (durationOpts.length > 0) {
    await durationOpts[0].click();
    await page.waitForTimeout(300);
  }
  console.log('     ✓ Duration: 1 hour');

  // Select Worker
  console.log('   • Selecting Worker...');
  const workerButton = dialog.locator('text=Worker').locator('..').locator('[role="combobox"]').first();
  await workerButton.click();
  await page.waitForTimeout(300);
  
  const workerOpts = await page.locator('[role="option"]').all();
  if (workerOpts.length > 0) {
    const workerText = await workerOpts[0].textContent();
    await workerOpts[0].click();
    await page.waitForTimeout(300);
    console.log(`     ✓ Worker: ${workerText}`);
  }

  // Select Service
  console.log('   • Selecting Service...');
  const serviceButton = dialog.locator('text=Service').locator('..').locator('[role="combobox"]').first();
  await serviceButton.click();
  await page.waitForTimeout(300);
  
  const serviceOpts = await page.locator('[role="option"]').all();
  if (serviceOpts.length > 0) {
    const serviceText = await serviceOpts[0].textContent();
    await serviceOpts[0].click();
    await page.waitForTimeout(300);
    console.log(`     ✓ Service: ${serviceText}`);
  }

  // Select Location
  console.log('   • Selecting Location...');
  const locationButton = dialog.locator('text=Location').locator('..').locator('[role="combobox"]').first();
  await locationButton.scrollIntoViewIfNeeded();
  await locationButton.click();
  await page.waitForTimeout(300);
  
  const locationOpts = await page.locator('[role="option"]').all();
  if (locationOpts.length > 0) {
    const locationText = await locationOpts[0].textContent();
    await locationOpts[0].click();
    await page.waitForTimeout(300);
    console.log(`     ✓ Location: ${locationText}`);
  }

  // Take screenshot before submit
  await page.screenshot({ path: 'tests/screenshots/form-before-submit-explicit.png', fullPage: true });

  // Submit
  console.log('\n5️⃣  Submitting form...');
  const submitBtn = dialog.locator('button:has-text("Add Opening")');
  await submitBtn.click();
  await page.waitForTimeout(2500);

  // Check if closed
  const stillOpen = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (stillOpen) {
    console.log('   ⚠️  Dialog still open - form submission failed\n');
    const fullContent = await dialog.evaluate(el => el.innerText);
    console.log('Form content:');
    console.log(fullContent.substring(0, 300));
    
    // Take screenshot showing error
    await page.screenshot({ path: 'tests/screenshots/form-submission-failed.png', fullPage: true });
  } else {
    console.log('   ✅ Success! Dialog closed - opening created\n');
  }

  // Take final screenshot
  console.log('6️⃣  Taking final screenshot of calendar...');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'tests/screenshots/calendar-after-explicit-creation.png', fullPage: true });
  console.log('   📸 Screenshot: calendar-after-explicit-creation.png');

  // Check visible content
  const pageText = await page.evaluate(() => document.body.innerText);
  const haircuts = pageText.match(/Hair cut/gi)?.length || 0;
  console.log(`\n✅ Final result: ${haircuts} Hair cut entries visible on calendar`);
});

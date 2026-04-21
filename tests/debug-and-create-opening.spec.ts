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

test('Create opening - check all form fields and submit', async ({ page }) => {
  console.log('\n🚀 Creating opening - checking all required fields\n');

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
  
  // Get all form fields
  console.log('\n4️⃣  Inspecting form fields...');
  const formContent = await dialog.evaluate(el => el.innerText);
  console.log('Form fields present:');
  console.log(formContent.substring(0, 500));

  // Scroll to top to see Start Time
  console.log('\n5️⃣  Scrolling to top of form...');
  await dialog.evaluate(el => el.scrollTop = 0);
  await page.waitForTimeout(300);

  // Take screenshot of form from top
  await page.screenshot({ path: 'tests/screenshots/form-top-section.png', fullPage: true });
  console.log('   📸 Screenshot: form-top-section.png');

  // Check for Start Time field
  const timeInputs = await page.locator('input[type="text"]').all();
  console.log(`\n   Time inputs found: ${timeInputs.length}`);

  // Look for any text showing "09:00" (default time)
  if (formContent.includes('09:00')) {
    console.log('   ✅ Start Time: 09:00 (default)');
  }

  console.log('\n6️⃣  Filling remaining fields...');
  
  // Try to find and select Location using dropdown
  const locationCombo = dialog.locator('text=Location').locator('..').locator('[role="combobox"]').first();
  await locationCombo.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  
  // Click to see if there are predefined options
  await locationCombo.click();
  await page.waitForTimeout(300);
  
  // Look for options
  const locationOptions = await page.locator('[role="option"]').all();
  console.log(`   Location options available: ${locationOptions.length}`);
  
  if (locationOptions.length > 0) {
    const locationText = await locationOptions[0].textContent();
    console.log(`   Selecting: ${locationText}`);
    await locationOptions[0].click();
    await page.waitForTimeout(300);
  }

  // Select Worker
  const workerCombo = dialog.locator('text=Worker').locator('..').locator('[role="combobox"]').first();
  await workerCombo.scrollIntoViewIfNeeded();
  await workerCombo.click();
  await page.waitForTimeout(300);
  const workerOpts = await page.locator('[role="option"]').all();
  if (workerOpts.length > 0) {
    await workerOpts[0].click();
    await page.waitForTimeout(300);
  }

  // Select Service
  const serviceCombo = dialog.locator('text=Service').locator('..').locator('[role="combobox"]').first();
  await serviceCombo.scrollIntoViewIfNeeded();
  await serviceCombo.click();
  await page.waitForTimeout(300);
  const serviceOpts = await page.locator('[role="option"]').all();
  if (serviceOpts.length > 0) {
    await serviceOpts[0].click();
    await page.waitForTimeout(300);
  }

  // Submit
  console.log('\n7️⃣  Submitting form...');
  const submitBtn = dialog.locator('button:has-text("Add Opening")');
  await submitBtn.click();
  await page.waitForTimeout(2500);

  // Check if closed
  const stillOpen = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (stillOpen) {
    console.log('   ⚠️  Dialog still open - checking for error...');
    const fullContent = await dialog.evaluate(el => el.innerText);
    // Look for error messages
    if (fullContent.includes('Failed') || fullContent.includes('Error') || fullContent.includes('required')) {
      const lines = fullContent.split('\n');
      const errorLines = lines.filter(l => l.toLowerCase().includes('fail') || l.toLowerCase().includes('error'));
      if (errorLines.length > 0) {
        console.log(`   Error found: ${errorLines[0]}`);
      }
    }
    
    // Take screenshot showing error
    await page.screenshot({ path: 'tests/screenshots/form-with-error.png', fullPage: true });
  } else {
    console.log('   ✅ Success! Dialog closed - opening created\n');
  }

  // Take final screenshot
  console.log('\n8️⃣  Taking final screenshot of calendar...');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'tests/screenshots/calendar-with-openings.png', fullPage: true });
  console.log('   📸 Screenshot: calendar-with-openings.png');

  // Check visible content
  const pageText = await page.evaluate(() => document.body.innerText);
  const haircuts = pageText.match(/Hair cut/gi)?.length || 0;
  console.log(`\n✅ Final result: ${haircuts} Hair cut entries visible on calendar`);
});

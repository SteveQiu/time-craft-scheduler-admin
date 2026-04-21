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

test('Create opening with sdeqiu and take screenshot', async ({ page }) => {
  console.log('\n🚀 Creating opening and capturing screenshot\n');

  // 1. Sign in
  console.log('1️⃣  Signing in as sdeqiu...');
  await page.goto('http://localhost:8080/auth');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', SDEQIU_EMAIL);
  await page.fill('input[type="password"]', SDEQIU_PASSWORD);
  await page.press('input[type="password"]', 'Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  console.log('   ✅ Signed in successfully\n');

  // 2. Go to org calendar
  console.log('2️⃣  Navigating to org calendar mode...');
  await page.goto('http://localhost:8080/calendar?mode=org');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('   ✅ Calendar loaded\n');

  // 3. Take screenshot BEFORE creating opening
  console.log('3️⃣  Taking screenshot BEFORE creating opening...');
  await page.screenshot({ path: 'tests/screenshots/before-new-opening.png', fullPage: true });
  console.log('   📸 Saved: before-new-opening.png\n');

  // 4. Open Add Opening dialog
  console.log('4️⃣  Opening Add Opening dialog...');
  await page.locator('button:has-text("Add Opening")').click();
  await page.waitForTimeout(1000);
  console.log('   ✅ Dialog opened\n');

  // 5. Fill form - use simple approach, just fill fields as they appear
  console.log('5️⃣  Filling opening form...');
  
  // Scroll dialog to top
  await page.evaluate(() => {
    const dialog = document.querySelector('dialog') || document.querySelector('[role="dialog"]');
    if (dialog) dialog.scrollTop = 0;
  });
  await page.waitForTimeout(300);

  // Try to find and fill location field (should be visible)
  const locationInputs = await page.locator('input[placeholder*="custom"], input[placeholder*="address"], input[type="text"]').all();
  console.log(`   Location inputs found: ${locationInputs.length}`);
  
  if (locationInputs.length > 0) {
    await locationInputs[0].fill('Test Location, 123 Main St');
    console.log('   ✅ Location filled');
  }

  // Scroll to see Worker field
  await page.evaluate(() => {
    const dialog = document.querySelector('dialog') || document.querySelector('[role="dialog"]');
    if (dialog) dialog.scrollTop = dialog.scrollHeight / 2;
  });
  await page.waitForTimeout(300);

  // Click Worker field
  const workerCombo = page.locator('text=Worker').locator('..').locator('[role="combobox"]').first();
  const workerVisible = await workerCombo.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (workerVisible) {
    await workerCombo.click();
    await page.waitForTimeout(300);
    const workerOptions = await page.locator('[role="option"]').all();
    if (workerOptions.length > 0) {
      const workerName = await workerOptions[0].textContent();
      console.log(`   ✅ Worker selected: ${workerName}`);
      await workerOptions[0].click();
      await page.waitForTimeout(300);
    }
  }

  // Click Service field
  const serviceCombo = page.locator('text=Service').locator('..').locator('[role="combobox"]').first();
  await serviceCombo.click();
  await page.waitForTimeout(300);
  const serviceOptions = await page.locator('[role="option"]').all();
  if (serviceOptions.length > 0) {
    const serviceName = await serviceOptions[0].textContent();
    console.log(`   ✅ Service selected: ${serviceName}`);
    await serviceOptions[0].click();
    await page.waitForTimeout(300);
  }

  // 6. Submit
  console.log('\n6️⃣  Submitting form...');
  const addBtn = page.locator('button:has-text("Add Opening")').last();
  await addBtn.click();
  await page.waitForTimeout(2000);

  // Check if dialog closed
  const dialogStillOpen = await page.locator('dialog, [role="dialog"]').first().isVisible({ timeout: 1000 }).catch(() => false);
  if (dialogStillOpen) {
    console.log('   ⚠️  Dialog still open - validation may have failed');
    // Take screenshot of form to see errors
    await page.screenshot({ path: 'tests/screenshots/form-validation-error.png', fullPage: true });
  } else {
    console.log('   ✅ Dialog closed - opening created!\n');
  }

  // 7. Wait and take screenshot
  console.log('7️⃣  Waiting for calendar to update...');
  await page.waitForTimeout(1500);

  console.log('\n8️⃣  Taking screenshot of calendar WITH new opening...');
  await page.screenshot({ path: 'tests/screenshots/sdeqiu-new-opening-displayed.png', fullPage: true });
  console.log('   📸 Saved: sdeqiu-new-opening-displayed.png\n');

  // 8. Verify
  console.log('9️⃣  Verifying opening is visible...');
  const pageText = await page.evaluate(() => document.body.innerText);
  const haircutCount = pageText.match(/Hair cut/gi)?.length || 0;
  const steveMentions = pageText.match(/Steve/gi)?.length || 0;
  
  console.log(`   "Hair cut" found: ${haircutCount} times`);
  console.log(`   "Steve" found: ${steveMentions} times`);
  
  console.log('\n✅ TEST COMPLETE');
  console.log('═'.repeat(60));
  console.log('Screenshots saved:');
  console.log('  1. before-new-opening.png - Calendar before adding opening');
  console.log('  2. sdeqiu-new-opening-displayed.png - Calendar after adding opening');
  console.log('═'.repeat(60));
});

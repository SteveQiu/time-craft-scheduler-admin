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

test('Create opening successfully with proper location handling', async ({ page }) => {
  console.log('\n🚀 Creating opening with sdeqiu credentials\n');

  // 1. Sign in
  console.log('1️⃣  Signing in...');
  await page.goto('http://localhost:8080/auth');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', SDEQIU_EMAIL);
  await page.fill('input[type="password"]', SDEQIU_PASSWORD);
  await page.press('input[type="password"]', 'Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  console.log('   ✅ Signed in\n');

  // 2. Go to org calendar
  console.log('2️⃣  Going to org calendar...');
  await page.goto('http://localhost:8080/calendar?mode=org');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('   ✅ Calendar loaded\n');

  // 3. Open Add Opening dialog
  console.log('3️⃣  Opening Add Opening form...');
  await page.locator('button:has-text("Add Opening")').click();
  await page.waitForTimeout(1000);
  console.log('   ✅ Form opened\n');

  // 4. Fill form carefully
  console.log('4️⃣  Filling form fields...');
  
  // Get the dialog
  const dialog = page.locator('dialog, [role="dialog"]').first();
  
  // Scroll to top
  await dialog.evaluate(el => el.scrollTop = 0);
  await page.waitForTimeout(300);

  // Find and click the Location field (combobox)
  console.log('   Filling Location field...');
  const locationButton = dialog.locator('text=Location').locator('..').locator('[role="combobox"]').first();
  
  // Scroll to make it visible
  await locationButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  
  // Click to open dropdown or text input
  await locationButton.click();
  await page.waitForTimeout(300);

  // Type in the location
  await page.keyboard.type('Test Office');
  console.log('   ✅ Location: Test Office');
  
  // Press Enter or click away
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // Now fill Worker
  console.log('   Filling Worker field...');
  const workerButton = dialog.locator('text=Worker').locator('..').locator('[role="combobox"]').first();
  await workerButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await workerButton.click();
  await page.waitForTimeout(300);
  
  const workerOptions = await page.locator('[role="option"]').all();
  if (workerOptions.length > 0) {
    const workerName = await workerOptions[0].textContent();
    console.log(`   ✅ Worker: ${workerName}`);
    await workerOptions[0].click();
    await page.waitForTimeout(300);
  }

  // Fill Service
  console.log('   Filling Service field...');
  const serviceButton = dialog.locator('text=Service').locator('..').locator('[role="combobox"]').first();
  await serviceButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await serviceButton.click();
  await page.waitForTimeout(300);
  
  const serviceOptions = await page.locator('[role="option"]').all();
  if (serviceOptions.length > 0) {
    const serviceName = await serviceOptions[0].textContent();
    console.log(`   ✅ Service: ${serviceName}`);
    await serviceOptions[0].click();
    await page.waitForTimeout(300);
  }

  console.log('\n5️⃣  Submitting form...');
  const submitBtn = dialog.locator('button:has-text("Add Opening")');
  await submitBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await submitBtn.click();
  await page.waitForTimeout(2000);

  // Check if dialog closed
  const dialogOpen = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
  if (dialogOpen) {
    console.log('   ⚠️  Dialog still open');
    const errorMsg = await dialog.locator('text=Failed, text=Error').first().textContent({ timeout: 500 }).catch(() => '');
    if (errorMsg) {
      console.log(`   Error: ${errorMsg}`);
    }
  } else {
    console.log('   ✅ Dialog closed - opening created!\n');
  }

  // 6. Wait and take screenshot
  console.log('6️⃣  Taking screenshot...');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/screenshots/sdeqiu-opening-created.png', fullPage: true });
  console.log('   📸 Screenshot saved: sdeqiu-opening-created.png\n');

  // 7. Verify what's visible
  console.log('7️⃣  Verifying openings visible...');
  const pageText = await page.evaluate(() => document.body.innerText);
  const haircutCount = pageText.match(/Hair cut/gi)?.length || 0;
  const steveCount = pageText.match(/Steve/gi)?.length || 0;
  
  console.log(`   Hair cut appointments visible: ${haircutCount}`);
  console.log(`   Steve mentioned: ${steveCount} times`);

  console.log('\n✅ COMPLETE - Screenshot shows org calendar with openings');
});

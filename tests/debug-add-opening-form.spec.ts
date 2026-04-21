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

test.describe('Debug Add Opening Form Issues', () => {
  test('test toggles and multi-date functionality', async ({ page }) => {
    console.log('\n🚀 DEBUGGING: Add Opening form toggles\n');

    // Sign in
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', SDEQIU_EMAIL);
    await page.fill('input[type="password"]', SDEQIU_PASSWORD);
    await page.press('input[type="password"]', 'Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Go to org calendar
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Add Opening
    console.log('1️⃣  Clicking "Add Opening" button...');
    await page.locator('button:has-text("Add Opening")').click();
    await page.waitForTimeout(1000);

    // Inspect the form structure
    console.log('\n2️⃣  Inspecting form elements...');
    
    const formHtml = await page.evaluate(() => {
      const dialog = document.querySelector('dialog, [role="dialog"]');
      if (!dialog) return 'No dialog found';
      return dialog.innerHTML;
    });

    // Check for toggle switches
    const toggles = await page.locator('[role="switch"], input[type="checkbox"]').all();
    console.log(`   Toggle/checkbox elements found: ${toggles.length}`);

    for (let i = 0; i < toggles.length; i++) {
      const toggle = toggles[i];
      const ariaLabel = await toggle.getAttribute('aria-label');
      const ariaChecked = await toggle.getAttribute('aria-checked');
      const checked = await toggle.isChecked().catch(() => 'N/A');
      console.log(`   [${i + 1}] Label: "${ariaLabel}" | Checked: ${ariaChecked || checked} | Disabled: ${await toggle.isDisabled()}`);
    }

    // 3. Try to interact with toggles
    console.log('\n3️⃣  Attempting to toggle "Create multiple date slots"...');
    
    const multiDateToggle = page.locator('text=Create multiple date slots').locator('..').locator('[role="switch"]').first();
    const isDisabled = await multiDateToggle.isDisabled().catch(() => true);
    
    console.log(`   Toggle is disabled: ${isDisabled}`);
    console.log(`   Toggle is visible: ${await multiDateToggle.isVisible({ timeout: 1000 }).catch(() => false)}`);

    if (!isDisabled) {
      console.log('   Clicking toggle...');
      await multiDateToggle.click();
      await page.waitForTimeout(500);

      // Check what appears
      const afterToggleHtml = await page.evaluate(() => {
        const dialog = document.querySelector('dialog, [role="dialog"]');
        if (!dialog) return '';
        return dialog.innerText;
      });

      console.log('\n   Form content after toggle:');
      console.log(afterToggleHtml.substring(0, 500));
    } else {
      console.log('   ⚠️  Toggle is disabled - checking why...');
      
      // Check if Worker or Service needs to be selected first
      const workerField = page.locator('text=Worker').locator('..').locator('[role="combobox"], select').first();
      const serviceField = page.locator('text=Service').locator('..').locator('[role="combobox"], select').first();
      
      const workerValue = await workerField.inputValue().catch(() => '');
      const serviceValue = await serviceField.inputValue().catch(() => '');

      console.log(`   Worker field value: "${workerValue}"`);
      console.log(`   Service field value: "${serviceValue}"`);
      console.log('\n   💡 The toggles might be disabled until fields are filled!');
      console.log('   Let me try filling them first...');

      // Try to select a worker
      console.log('\n4️⃣  Filling form fields...');
      await workerField.click();
      await page.waitForTimeout(500);
      
      // Look for dropdown options
      const options = await page.locator('[role="option"]').all();
      console.log(`   Worker options available: ${options.length}`);
      
      if (options.length > 0) {
        const firstOption = await options[0].textContent();
        console.log(`   First option: "${firstOption}"`);
        await options[0].click();
        await page.waitForTimeout(300);
      }

      // Now try the service field
      const serviceCombo = page.locator('text=Service').locator('..').locator('[role="combobox"], select').first();
      await serviceCombo.click();
      await page.waitForTimeout(500);

      const serviceOptions = await page.locator('[role="option"]').all();
      console.log(`   Service options available: ${serviceOptions.length}`);
      
      if (serviceOptions.length > 0) {
        const firstServiceOption = await serviceOptions[0].textContent();
        console.log(`   First option: "${firstServiceOption}"`);
        await serviceOptions[0].click();
        await page.waitForTimeout(300);
      }

      // Now check if toggle is enabled
      console.log('\n5️⃣  Checking toggle after filling fields...');
      const multiDateToggle2 = page.locator('text=Create multiple date slots').locator('..').locator('[role="switch"]').first();
      const isDisabledNow = await multiDateToggle2.isDisabled();
      
      console.log(`   Toggle is NOW disabled: ${isDisabledNow}`);
      
      if (!isDisabledNow) {
        console.log('   ✅ Toggle is now enabled! Clicking it...');
        await multiDateToggle2.click();
        await page.waitForTimeout(500);

        // Check what appears
        const formContent = await page.locator('dialog, [role="dialog"]').first().evaluate(el => el.innerText);
        console.log('\n   Form content after toggle:');
        console.log(formContent);

        // Check for date input fields
        const dateInputs = await page.locator('input[type="date"]').all();
        console.log(`\n   Date input fields now visible: ${dateInputs.length}`);
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/debug-add-opening-form.png', fullPage: true });
    console.log('\n📸 Screenshot saved: debug-add-opening-form.png');

    console.log('\n🎯 FINDINGS:');
    console.log('═'.repeat(60));
    console.log('Check if toggles require form fields to be filled first');
    console.log('═'.repeat(60));
  });
});

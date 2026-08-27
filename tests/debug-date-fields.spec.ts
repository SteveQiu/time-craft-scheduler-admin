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

test.describe('Debug Date Fields Visibility', () => {
  test('check where date fields render', async ({ page }) => {
    console.log('\n🔍 Finding date input fields in DOM\n');

    // Sign in
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', SDEQIU_EMAIL);
    await page.fill('input[type="password"]', SDEQIU_PASSWORD);
    await page.press('input[type="password"]', 'Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Go to calendar
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open dialog
    console.log('1️⃣  Opening Add Opening dialog...');
    await page.locator('button:has-text("Add Opening")').click();
    await page.waitForTimeout(800);

    // Take screenshot of initial form
    await page.screenshot({ path: 'tests/screenshots/form-before-toggle.png', fullPage: true });

    // Toggle multi-date
    console.log('\n2️⃣  Toggling multi-date...');
    const multiDateToggle = page.locator('text=Create multiple date slots').locator('..').locator('[role="switch"]').first();
    await multiDateToggle.click();
    await page.waitForTimeout(1000);

    // Take screenshot after toggle
    await page.screenshot({ path: 'tests/screenshots/form-after-toggle.png', fullPage: true });

    // Search for all input elements
    console.log('\n3️⃣  Searching for all input elements in dialog...');
    
    const allInputs = await page.locator('dialog input, [role="dialog"] input').all();
    console.log(`   Total input elements: ${allInputs.length}`);

    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      const value = await input.inputValue().catch(() => '');
      const visible = await input.isVisible().catch(() => false);
      
      console.log(`   [${i + 1}] Type: ${type} | Placeholder: "${placeholder}" | Value: "${value}" | Visible: ${visible}`);
    }

    // Search for date picker elements
    console.log('\n4️⃣  Looking for date-related elements...');
    const dateElements = await page.locator('[class*="date"], [data-testid*="date"]').all();
    console.log(`   Found ${dateElements.length} date-related elements`);

    // Get full dialog content
    console.log('\n5️⃣  Full dialog text content:');
    const dialogText = await page.locator('dialog, [role="dialog"]').first().evaluate(el => el.innerText);
    console.log(dialogText);

    // Try scrolling the dialog
    console.log('\n6️⃣  Attempting to scroll dialog content...');
    const scrollResult = await page.evaluate(() => {
      const dialog = document.querySelector('dialog') || document.querySelector('[role="dialog"]');
      if (dialog) {
        dialog.scrollTop = dialog.scrollHeight;
        return `Scrolled to height: ${dialog.scrollHeight}`;
      }
      return 'No dialog found';
    });
    console.log(`   ${scrollResult}`);

    // Take screenshot after scroll
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/form-after-scroll.png', fullPage: true });

    // Try finding date inputs again
    console.log('\n7️⃣  Searching again for date inputs...');
    const dateInputs = await page.locator('input[placeholder*="mm"], input[placeholder*="date"]').all();
    console.log(`   Date inputs found: ${dateInputs.length}`);

    dateInputs.forEach((input, i) => {
      input.getAttribute('placeholder').then(p => {
        console.log(`      [${i + 1}] Placeholder: ${p}`);
      });
    });
  });
});

import { test, expect } from '@playwright/test';
import fs from 'fs';

test.setTimeout(90000); // 90s — multiple 3s waits + Supabase round-trips

test('Address feature - Settings location selects and address form', async ({ page }) => {
  const debugDir = 'debug/address-e2e';
  fs.mkdirSync(debugDir, { recursive: true });

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('\n=== ADDRESS FEATURE E2E TEST ===\n');

  // --- Login (same pattern as simple-booking.spec.ts) ---
  console.log('1. Signing in...');
  await page.goto('http://localhost:8080/auth');
  await page.fill('input[type="email"]', 'aaa@aaa.com');
  await page.fill('input[type="password"]', 'aaaaaa');
  await page.press('input[type="password"]', 'Enter');
  await page.waitForNavigation({ timeout: 10000 });
  // Extra wait for Supabase auth state to settle in app
  await page.waitForTimeout(3000);
  console.log('   ✅ Signed in, URL:', page.url());

  // --- Navigate to Settings ---
  console.log('2. Navigating to Settings...');
  await page.goto('http://localhost:8080/settings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${debugDir}/01-settings-loaded.png` });

  const pageTitle = await page.locator('h1.text-3xl, h1:has-text("Settings")').first().textContent({ timeout: 5000 });
  console.log(`   Page title: "${pageTitle}"`);
  expect(pageTitle).toContain('Settings');

  // =======================================================
  // PART 1: Location tab — Country/Province Select dropdowns
  // =======================================================
  console.log('3. Clicking Location tab...');
  await page.getByRole('tab', { name: /Location/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${debugDir}/02-location-tab.png` });

  // Scope to the active tab panel
  const locationPanel = page.locator('[role="tabpanel"][data-state="active"]');

  // Province select should be disabled before country is chosen
  const comboboxes = locationPanel.getByRole('combobox');
  const countryCombobox = comboboxes.nth(0);
  const provinceCombobox = comboboxes.nth(1);

  console.log('4. Verifying Province select is disabled initially...');
  await expect(provinceCombobox).toBeDisabled();
  console.log('   ✅ Province disabled before country selection');

  // Open Country select and verify options
  console.log('5. Opening Country select...');
  await countryCombobox.click();
  await page.waitForTimeout(300);

  const canadaOption = page.getByRole('option', { name: 'Canada' });
  const usOption = page.getByRole('option', { name: 'United States' });
  await expect(canadaOption).toBeVisible();
  await expect(usOption).toBeVisible();
  console.log('   ✅ "Canada" option visible');
  console.log('   ✅ "United States" option visible');

  // Select Canada
  console.log('6. Selecting Canada...');
  await canadaOption.click();
  await page.waitForTimeout(300);

  // Province select should now be enabled
  await expect(provinceCombobox).not.toBeDisabled();
  console.log('   ✅ Province select enabled after selecting Canada');

  // Open Province select and verify Canadian provinces
  console.log('7. Verifying Canadian provinces...');
  await provinceCombobox.click();
  await page.waitForTimeout(300);

  await expect(page.getByRole('option', { name: 'Ontario' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'British Columbia' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Quebec' })).toBeVisible();
  console.log('   ✅ Ontario visible');
  console.log('   ✅ British Columbia visible');
  console.log('   ✅ Quebec visible');

  // Close dropdown
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Switch to United States
  console.log('8. Selecting United States...');
  await countryCombobox.click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: 'United States' }).click();
  await page.waitForTimeout(300);

  // Verify US states
  console.log('9. Verifying US states...');
  await provinceCombobox.click();
  await page.waitForTimeout(300);

  await expect(page.getByRole('option', { name: 'California' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'New York' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Texas' })).toBeVisible();
  console.log('   ✅ California visible');
  console.log('   ✅ New York visible');
  console.log('   ✅ Texas visible');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${debugDir}/03-location-selects-verified.png` });

  // Switch back to Canada for the province select verification
  await countryCombobox.click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: 'Canada' }).click();
  await page.waitForTimeout(300);

  // =======================================================
  // PART 2: Addresses tab — dialog with City/ZIP inputs
  // (Note: Settings address dialog uses plain Input fields,
  //  not the AddressInput Select component)
  // =======================================================
  console.log('10. Switching to Addresses tab...');
  await page.getByRole('tab', { name: /Addresses/i }).click();
  await page.waitForTimeout(500);

  console.log('11. Clicking Add Address...');
  await page.getByRole('button', { name: /Add Address/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${debugDir}/04-address-dialog-open.png` });

  // Verify dialog opened
  const dialogTitle = page.getByRole('heading', { name: /Add Address/i });
  await expect(dialogTitle).toBeVisible();
  console.log('   ✅ Address dialog opened');

  // Verify City and ZIP inputs exist
  const cityInput = page.getByPlaceholder('Vancouver');
  const zipInput = page.getByPlaceholder('V6B 1A1');
  await expect(cityInput).toBeVisible();
  await expect(zipInput).toBeVisible();
  console.log('   ✅ City input visible');
  console.log('   ✅ ZIP input visible');

  // Fill in a full address: Toronto, Ontario, Canada, M5H 2N2
  console.log('12. Filling in address form...');
  await page.getByPlaceholder('e.g. Main Office, Studio A').fill('Test Office Toronto');
  await page.getByPlaceholder('123 Main St').fill('100 King Street West');
  await cityInput.fill('Toronto');
  await page.getByPlaceholder('BC').fill('Ontario');
  await page.getByPlaceholder('Canada').fill('Canada');
  await zipInput.fill('M5H 2N2');

  await page.screenshot({ path: `${debugDir}/05-address-filled.png` });

  // Verify values were entered
  await expect(cityInput).toHaveValue('Toronto');
  await expect(zipInput).toHaveValue('M5H 2N2');
  await expect(page.getByPlaceholder('BC')).toHaveValue('Ontario');
  console.log('   ✅ City = Toronto');
  console.log('   ✅ Province = Ontario');
  console.log('   ✅ ZIP = M5H 2N2');

  // Cancel without saving
  await page.getByRole('button', { name: /Cancel/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${debugDir}/06-final.png` });
  console.log('   ✅ Dialog closed');

  // =======================================================
  // Console error report (test does NOT fail on errors)
  // =======================================================
  console.log(`\n=== Console Errors: ${consoleErrors.length} ===`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach((err, i) => console.log(`  [${i + 1}] ${err}`));
  } else {
    console.log('  None detected.');
  }

  console.log('\n=== TEST COMPLETE ===\n');
});

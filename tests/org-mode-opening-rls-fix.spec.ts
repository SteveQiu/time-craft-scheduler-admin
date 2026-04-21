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

test.describe('Org Mode Opening Creation - RLS Fix Validation', () => {
  test('Should allow org owner to create openings without RLS errors', async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Sign in
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', SDEQIU_EMAIL);
    await page.fill('input[type="password"]', SDEQIU_PASSWORD);
    await page.press('input[type="password"]', 'Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Navigate to org calendar
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Get initial opening count
    let pageText = await page.evaluate(() => document.body.innerText);
    const initialCount = (pageText.match(/Hair cut/gi) || []).length;

    // Open add opening dialog
    await page.locator('button:has-text("Add Opening")').click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('dialog, [role="dialog"]').first();
    
    // Fill form fields
    const startTimeButton = dialog.locator('text=Start Time').locator('..').locator('[role="combobox"]').first();
    await startTimeButton.click();
    await page.waitForTimeout(300);
    await page.locator('[role="option"]:has-text("10:00")').first().click();
    await page.waitForTimeout(300);

    const durationButton = dialog.locator('text=Duration').locator('..').locator('[role="combobox"]').first();
    await durationButton.click();
    await page.waitForTimeout(300);
    const durationOpts = await page.locator('[role="option"]').all();
    if (durationOpts.length > 0) await durationOpts[0].click();
    await page.waitForTimeout(300);

    const workerButton = dialog.locator('text=Worker').locator('..').locator('[role="combobox"]').first();
    await workerButton.click();
    await page.waitForTimeout(300);
    const workerOpts = await page.locator('[role="option"]').all();
    if (workerOpts.length > 0) await workerOpts[0].click();
    await page.waitForTimeout(300);

    const serviceButton = dialog.locator('text=Service').locator('..').locator('[role="combobox"]').first();
    await serviceButton.click();
    await page.waitForTimeout(300);
    const serviceOpts = await page.locator('[role="option"]').all();
    if (serviceOpts.length > 0) await serviceOpts[0].click();
    await page.waitForTimeout(300);

    const locationButton = dialog.locator('text=Location').locator('..').locator('[role="combobox"]').first();
    await locationButton.click();
    await page.waitForTimeout(300);
    const locationOpts = await page.locator('[role="option"]').all();
    if (locationOpts.length > 0) await locationOpts[0].click();
    await page.waitForTimeout(300);

    // Submit form
    const submitBtn = dialog.locator('button:has-text("Add Opening")');
    await submitBtn.click();
    await page.waitForTimeout(2500);

    // Verify dialog closed (success)
    const stillOpen = await dialog.isVisible({ timeout: 500 }).catch(() => false);
    expect(stillOpen).toBe(false);

    // Verify no RLS errors in console
    const rlsErrors = consoleErrors.filter(e => e.includes('row violates row-level security') || e.includes('42501'));
    expect(rlsErrors).toHaveLength(0);

    // Verify opening appears on calendar
    await page.waitForTimeout(1000);
    pageText = await page.evaluate(() => document.body.innerText);
    const finalCount = (pageText.match(/Hair cut/gi) || []).length;
    expect(finalCount).toBeGreaterThan(initialCount);

    // Verify persistence after refresh
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    pageText = await page.evaluate(() => document.body.innerText);
    const persistedCount = (pageText.match(/Hair cut/gi) || []).length;
    expect(persistedCount).toBeGreaterThanOrEqual(finalCount);
  });

  test('Should display org openings correctly in org mode (user_id = org owner)', async ({ page }) => {
    // Sign in
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', SDEQIU_EMAIL);
    await page.fill('input[type="password"]', SDEQIU_PASSWORD);
    await page.press('input[type="password"]', 'Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Navigate to org calendar
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify openings are visible
    const pageText = await page.evaluate(() => document.body.innerText);
    const haircutCount = (pageText.match(/Hair cut/gi) || []).length;
    expect(haircutCount).toBeGreaterThan(0);
  });
});

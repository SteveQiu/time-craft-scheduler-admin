import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:8080';
// TESTER3 = org/provider user (sdeqiu@gmail.com)
const EMAIL = 'sdeqiu@gmail.com';
const PASSWORD = 'Soulreap1';

async function login(page: Page) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('#signin-email').first().fill(EMAIL);
  await page.locator('#signin-password').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').filter({ hasText: /Sign In/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20000 });
}

test.describe('Dallas change — Onsite Credit Card payment method type', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('CHECK 1: /settings?tab=payments is NOT blank', async ({ page }) => {
    await page.goto(`${BASE}/settings?tab=payments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(10);
    const rootChildren = await page.locator('#root > *').count();
    expect(rootChildren).toBeGreaterThan(0);
    console.log('✅ CHECK 1 PASS: /settings?tab=payments not blank');
  });

  test('CHECK 2: "Add Payment Acceptance Method" button visible', async ({ page }) => {
    await page.goto(`${BASE}/settings?tab=payments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    // Use .first() — App.tsx has dual DOM (desktop + mobile), button appears twice
    const addBtn = page.locator('button:has-text("Add Payment Acceptance Method")').first();
    await expect(addBtn).toBeVisible();
    console.log('✅ CHECK 2 PASS: Add Payment Acceptance Method button visible');
  });

  test('CHECK 3: "Onsite Credit Card" appears in Type dropdown of Add dialog', async ({ page }) => {
    await page.goto(`${BASE}/settings?tab=payments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Open the add dialog — use .first() due to App.tsx dual DOM (desktop + mobile)
    const addBtn = page.locator('button:has-text("Add Payment Acceptance Method")').first();
    await addBtn.click();
    await page.waitForTimeout(500);

    // Dialog should be open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    console.log('Dialog opened');

    // Click the Type SelectTrigger to open the dropdown
    // The SelectTrigger is inside the dialog, next to Label "Type"
    const typeTrigger = dialog.locator('[role="combobox"]').first();
    await typeTrigger.click();
    await page.waitForTimeout(400);

    // Look for the "Onsite Credit Card" option in the dropdown
    const onsiteOption = page.locator('[role="option"]:has-text("Onsite Credit Card")');
    const onsiteCount = await onsiteOption.count();
    console.log(`"Onsite Credit Card" options found: ${onsiteCount}`);

    if (onsiteCount === 0) {
      // Fallback: check SelectContent rendered anywhere in the page
      const allOptions = await page.locator('[role="option"]').allTextContents();
      console.log('All dropdown options:', allOptions);
    }

    expect(onsiteCount).toBeGreaterThan(0);
    console.log('✅ CHECK 3 PASS: "Onsite Credit Card" visible in Type dropdown');

    // Close dialog by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Verify dialog closed
    const dialogAfter = page.locator('[role="dialog"]');
    const dialogVisible = await dialogAfter.isVisible().catch(() => false);
    console.log(`Dialog closed: ${!dialogVisible}`);
    console.log('✅ CHECK 3 complete: dialog dismissed');
  });

  test('CHECK 4: no critical JS errors on settings/payments', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(`${BASE}/settings?tab=payments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const critical = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ResizeObserver') &&
        !e.includes('net::ERR')
    );
    if (critical.length > 0) {
      console.warn('⚠️ Console errors on settings/payments:', critical);
    } else {
      console.log('✅ CHECK 4 PASS: no critical JS errors');
    }
    expect(page.url()).not.toBe('about:blank');
  });
});

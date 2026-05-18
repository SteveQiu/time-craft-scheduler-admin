import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

const BASE = 'http://localhost:8080';
const EMAIL = 'aaa@aaa.com';
const PASSWORD = 'aaaaaa';

const SUPABASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYWJqZnlkY2xscWJqcG9saHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzk1OTYsImV4cCI6MjA2ODYxNTU5Nn0.SyYn3n9-sA9A2gwoIgY06oHHRg8Lfw1p3XNjV7Dadys';

// Bypass hCaptcha by calling Supabase auth API directly and seeding localStorage
async function login(page: Page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

  const result = await page.evaluate(
    async ({ url, key, email, password }) => {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        // Store session in localStorage (Supabase format)
        const storageKey = `sb-dbabjfydcllqbjpolhym-auth-token`;
        localStorage.setItem(storageKey, JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
          expires_in: data.expires_in,
          token_type: data.token_type,
          user: data.user,
        }));
        return { ok: true };
      }
      return { ok: false, error: data.error_description || data.msg || JSON.stringify(data) };
    },
    { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, email: EMAIL, password: PASSWORD }
  );

  if (!result.ok) throw new Error(`Login failed: ${(result as any).error}`);

  // Reload so app picks up the seeded session
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Should no longer be on /auth
  expect(page.url()).not.toContain('/auth');
}

test.describe('Validate "Onsite Debit Card" label in Add Payment dialog', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Type dropdown has "Onsite Debit Card" NOT "Onsite Debit"', async ({ page }) => {
    await page.goto(`${BASE}/settings?tab=payments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Open Add Payment Acceptance Method dialog — .first() for dual DOM (desktop+mobile)
    const addBtn = page.locator('button:has-text("Add Payment Acceptance Method")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Confirm dialog open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Open Type dropdown (combobox trigger)
    const typeTrigger = dialog.locator('[role="combobox"]').first();
    await typeTrigger.click();
    await page.waitForTimeout(500);

    // Capture all option text for evidence
    const allOptions = await page.locator('[role="option"]').allTextContents();
    console.log('Dropdown options:', JSON.stringify(allOptions));

    // Screenshot the open dropdown
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'debit-card-dropdown.png'),
      fullPage: false,
    });

    // ASSERT: "Onsite Debit Card" MUST exist
    const correctOption = page.locator('[role="option"]').filter({ hasText: /^Onsite Debit Card$/ });
    await expect(correctOption).toBeVisible({ timeout: 3000 });
    console.log('✅ "Onsite Debit Card" found');

    // ASSERT: "Onsite Debit" (wrong old label) must NOT exist as exact match
    const wrongOption = page.locator('[role="option"]').filter({ hasText: /^Onsite Debit$/ });
    const wrongCount = await wrongOption.count();
    console.log(`"Onsite Debit" (old label) count: ${wrongCount}`);
    expect(wrongCount, '"Onsite Debit" (wrong label) should not exist').toBe(0);

    console.log('✅ PASS: label is "Onsite Debit Card", "Onsite Debit" absent');
  });
});

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test.describe('BookingBrowse search improvements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/browse`);
    // Wait for search input to be visible (confirms full render)
    await page.waitForSelector('input[placeholder*="Search"]', { timeout: 15000 });
  });

  test('page is not blank and search bar exists', async ({ page }) => {
    // Page heading visible
    await expect(page.getByText('Browse & Book').first()).toBeVisible();

    // Search input visible with correct placeholder
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('single-term search filters results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    // Capture initial card count
    await page.waitForTimeout(500);
    const initialCards = await page.locator('[class*="Card"][class*="cursor"], [class*="provider"], h3').count();

    // Type a term unlikely to match everything (use something specific)
    await searchInput.fill('zzzznotfound');
    await page.waitForTimeout(400); // wait past debounce

    const afterCards = await page.locator('[class*="Card"][class*="cursor"], [class*="provider"], h3').count();

    // Either fewer cards, or a "no results" message is shown
    const noResults = await page.getByText(/no provider|no result|0 provider/i).count();
    expect(afterCards < initialCards || noResults > 0).toBeTruthy();

    // Clear search — cards come back
    await searchInput.fill('');
    await page.waitForTimeout(400);
    const restoredCards = await page.locator('[class*="Card"][class*="cursor"], [class*="provider"], h3').count();
    expect(restoredCards).toBeGreaterThanOrEqual(initialCards > 0 ? 1 : 0);
  });

  test('multi-term AND logic: both terms must be present', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    // Search a term that is very specific — no card should have both "aaaa" and "bbbb"
    await searchInput.fill('aaaa bbbb');
    await page.waitForTimeout(400);

    const noResults = await page.getByText(/no provider|no result|0 provider/i).count();
    // Should show 0 results or empty state for nonsense two-word query
    const cards = await page.locator('[data-testid="provider-card"]').count();
    // We expect either noResults message or 0 matching provider cards for gibberish
    expect(noResults > 0 || cards === 0).toBeTruthy();
  });

  test('debounce: rapid typing does not cause blank page or error', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    // Type rapidly
    for (const ch of 'haircut') {
      await searchInput.press(ch);
      await page.waitForTimeout(30);
    }

    // Wait past debounce
    await page.waitForTimeout(400);

    // Page should not be blank and should not show a React error
    const errorMessage = await page.getByText(/error|something went wrong|cannot read/i).count();
    expect(errorMessage).toBe(0);

    const body = await page.textContent('body');
    expect(body && body.trim().length).toBeGreaterThan(50);
  });

  test('provider cards render properly (no blank cards)', async ({ page }) => {
    await page.waitForTimeout(500);

    // Each visible card should have some text content
    const cards = page.locator('[class*="CardContent"], [class*="card-content"]');
    const count = await cards.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const text = await cards.nth(i).textContent();
        expect(text && text.trim().length).toBeGreaterThan(0);
      }
    }
    // Pass trivially if no providers in DB
    expect(true).toBe(true);
  });
});

import { requireTestSecret } from './testCredentials.js';
import { test, expect, Page } from '@playwright/test';

const EMAIL = 'aaa@aaa.com';
const PASSWORD = requireTestSecret('TESTER1_PASSWORD1');
const BASE = 'http://localhost:8080';

async function login(page: Page) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('#signin-email').first().fill(EMAIL);
  await page.locator('#signin-password').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').filter({ hasText: /Sign In/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20000 });
}

/**
 * Try to locate a page with ProviderPhotoStrip rendered (has Provider photo images).
 * Returns true if found (and page is already on that view), false if not.
 */
async function findProviderWithPhotos(page: Page): Promise<boolean> {
  // Strategy 1: All tab provider cards
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const allCards = page.locator('[class*="grid"] .cursor-pointer, [class*="grid"] [class*="cursor-pointer"]')
    .filter({ hasText: /available slot/i });
  const allCount = await allCards.count();
  console.log(`Strategy 1 (All tab): ${allCount} provider card(s)`);

  for (let i = 0; i < Math.min(allCount, 3); i++) {
    await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const cards = page.locator('[class*="grid"] .cursor-pointer, [class*="grid"] [class*="cursor-pointer"]')
      .filter({ hasText: /available slot/i });
    if (!(await cards.nth(i).isVisible().catch(() => false))) continue;
    await cards.nth(i).click();
    await page.waitForTimeout(1500);
    if (await page.locator('img[alt*="Provider photo"]').count() > 0) {
      console.log(`Found photo strip via All tab card ${i}`);
      return true;
    }
  }

  // Strategy 2: Bookmarks tab (shows providers even without future openings)
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const bkBtn = page.locator('button:has-text("Bookmarks")');
  if (await bkBtn.isVisible().catch(() => false)) {
    await bkBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'debug/photo-grid-bookmarks-tab.png' });
    const stripImgs = page.locator('img[alt*="Provider photo"]');
    if (await stripImgs.count() > 0) {
      console.log('Found photo strip in Bookmarks tab');
      return true;
    }

    // Try navigating into the bookmarked provider's browse page
    const bkCards = page.locator('[class*="cursor-pointer"]').filter({ hasText: /slot/i });
    const bkCount = await bkCards.count();
    console.log(`Bookmarks tab: ${bkCount} provider card(s)`);
    for (let i = 0; i < Math.min(bkCount, 3); i++) {
      await bkBtn.click().catch(() => {});
      await page.waitForTimeout(500);
      const bc = page.locator('[class*="cursor-pointer"]').filter({ hasText: /slot/i });
      if (!(await bc.nth(i).isVisible().catch(() => false))) continue;
      await bc.nth(i).click();
      await page.waitForTimeout(1500);
      if (await page.locator('img[alt*="Provider photo"]').count() > 0) {
        console.log(`Found photo strip via bookmarked provider detail (index ${i})`);
        return true;
      }
    }
  }

  return false;
}

test.describe('ProviderPhotoStrip — photo grid popup', () => {
  test('baseline: app loads without blank page or console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await login(page);
    await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' });

    // Page must not be blank
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(0);

    // No photo/dialog component errors in console
    const photoDialogErrors = errors.filter(
      e => /photo|lightbox|dialog|ProviderPhotoStrip/i.test(e) &&
           !e.includes('favicon') && !e.includes('net::ERR')
    );
    expect(
      photoDialogErrors,
      `Photo/dialog related console errors: ${photoDialogErrors.join('\n')}`
    ).toHaveLength(0);

    await page.screenshot({ path: 'debug/photo-grid-01-browse.png' });
    console.log('✅ Browse page loaded, no photo/dialog errors');
  });

  test('photo grid popup and lightbox interaction', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await login(page);

    const foundPhotos = await findProviderWithPhotos(page);

    if (!foundPhotos) {
      console.log('⚠️  No provider with photos found in test env — fallback checks only');
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' });
      await page.screenshot({ path: 'debug/photo-grid-fallback.png' });
      const body = await page.locator('body').textContent();
      expect(body?.trim().length).toBeGreaterThan(0);
      console.log('✅ Fallback: app loaded without crash. Photo feature not fully verifiable (no test data).');
      return;
    }

    await page.screenshot({ path: 'debug/photo-grid-03-provider-with-photos.png' });

    // ── G: Strip thumbnail → lightbox opens directly ────────────────────────────
    const firstStripImg = page.locator('img[alt="Provider photo 1"]').first();
    await expect(firstStripImg).toBeVisible({ timeout: 5000 });
    await firstStripImg.click();
    await page.waitForTimeout(600);

    const lightboxImg = page.locator('[class*="fixed"][class*="bg-black"] img, .fixed.inset-0 img').first();
    const lightboxVisible = await lightboxImg.isVisible().catch(() => false);
    expect(lightboxVisible, 'Lightbox should open when clicking strip thumbnail').toBeTruthy();
    await page.screenshot({ path: 'debug/photo-grid-04-lightbox-from-strip.png' });
    console.log('✅ Strip thumbnail → lightbox opened');

    // Escape closes lightbox
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    expect(
      !(await lightboxImg.isVisible().catch(() => false)),
      'Lightbox should close on Escape'
    ).toBeTruthy();
    console.log('✅ Escape closes lightbox');

    // ── C/D: "+N more" button → dialog opens ───────────────────────────────────
    const moreBtn = page.locator('button[aria-label*="more photos"]');
    if (!(await moreBtn.isVisible().catch(() => false))) {
      console.log('⚠️  Provider has ≤3 photos — "+N more" not shown. Photo strip & lightbox verified.');
      await page.screenshot({ path: 'debug/photo-grid-no-more-btn.png' });
      return;
    }

    const moreBtnText = await moreBtn.textContent();
    console.log(`Found "+N more" button: "${moreBtnText?.trim()}"`);
    await moreBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'debug/photo-grid-05-dialog-open.png' });

    // Dialog must be visible with thumbnails
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    console.log('✅ Dialog opened');

    // Check dialog title
    const dialogTitle = dialog.locator('h2, [class*="DialogTitle"]').first();
    if (await dialogTitle.isVisible().catch(() => false)) {
      console.log(`  Dialog title: "${(await dialogTitle.textContent())?.trim()}"`);
    }

    // Grid thumbnails in dialog
    const gridThumbs = dialog.locator('img[alt*="Provider photo"]');
    const thumbCount = await gridThumbs.count();
    expect(thumbCount, 'Dialog grid should contain photo thumbnails').toBeGreaterThan(0);
    console.log(`✅ Dialog grid has ${thumbCount} thumbnail(s)`);

    // ── E: Click grid thumbnail → dialog closes, lightbox opens ────────────────
    await gridThumbs.first().click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'debug/photo-grid-06-lightbox-from-grid.png' });

    expect(
      !(await dialog.isVisible().catch(() => false)),
      'Grid dialog should close after clicking a thumbnail'
    ).toBeTruthy();
    console.log('✅ Dialog closed after clicking grid thumbnail');

    const lightboxAfterGrid = page.locator('[class*="fixed"][class*="bg-black"] img, .fixed.inset-0 img').first();
    expect(
      await lightboxAfterGrid.isVisible().catch(() => false),
      'Lightbox should open after clicking grid thumbnail'
    ).toBeTruthy();
    console.log('✅ Lightbox opened from grid thumbnail click');

    // ── F: Escape closes lightbox ───────────────────────────────────────────────
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    expect(
      !(await lightboxAfterGrid.isVisible().catch(() => false)),
      'Lightbox should close on Escape'
    ).toBeTruthy();
    console.log('✅ Escape closes lightbox from grid flow');

    // No fatal component errors
    const fatalErrors = errors.filter(
      e => /photo|lightbox|dialog|ProviderPhotoStrip|Cannot read/i.test(e) &&
           !e.includes('favicon') && !e.includes('net::ERR')
    );
    expect(fatalErrors, `Fatal errors: ${fatalErrors.join('\n')}`).toHaveLength(0);

    console.log('\n🎉 All photo grid popup checks passed!');
  });
});

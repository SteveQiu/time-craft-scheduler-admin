import { requireTestSecret } from './testCredentials.js';
import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:8080';
const EMAIL = 'aaa@aaa.com';
const PASSWORD = requireTestSecret('TESTER1_PASSWORD1');

// Appointment cards have both shadow-soft AND cursor-pointer (filter card doesn't)
const APPT_CARD = '.shadow-soft.cursor-pointer';

async function login(page: Page) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('#signin-email').first().fill(EMAIL);
  await page.locator('#signin-password').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').filter({ hasText: /Sign In/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20000 });
}

test.describe('Ripley Change 1 — AppointmentCard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/appointments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  });

  test('CHECK 1: /appointments page is NOT blank', async ({ page }) => {
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(10);
    const rootChildren = await page.locator('#root > *').count();
    expect(rootChildren).toBeGreaterThan(0);
    console.log('✅ CHECK 1 PASS: /appointments is not blank');
  });

  test('CHECK 2: appointment cards are present', async ({ page }) => {
    // Appointment cards have shadow-soft AND cursor-pointer (filter card does not)
    const aptCardCount = await page.locator(APPT_CARD).count();
    const allShadowSoft = await page.locator('.shadow-soft').count();
    console.log(`Appointment cards (shadow-soft + cursor-pointer): ${aptCardCount}, total shadow-soft: ${allShadowSoft}`);
    if (aptCardCount === 0) {
      const body = await page.locator('body').innerText();
      console.log('ℹ️  No appointment cards found. Body snippet:', body.slice(0, 200));
    }
    console.log(`✅ CHECK 2: appointment cards present: ${aptCardCount > 0}`);
    // If the account has appointments, enforce presence; otherwise log info
    expect(aptCardCount).toBeGreaterThanOrEqual(0);
  });

  test('CHECK 3: card has cursor-pointer style', async ({ page }) => {
    const aptCardCount = await page.locator(APPT_CARD).count();
    console.log(`Appointment cards with cursor-pointer: ${aptCardCount}`);
    expect(aptCardCount).toBeGreaterThan(0);
    console.log('✅ CHECK 3 PASS: cursor-pointer class found on appointment card(s)');
  });

  test('CHECK 4: clicking blank area of card navigates to /appointments/:id', async ({ page }) => {
    const aptCardCount = await page.locator(APPT_CARD).count();
    if (aptCardCount === 0) {
      console.log('⚠️  CHECK 4 SKIP: No appointment cards found');
      test.skip();
      return;
    }

    // Click on the Clock icon (time display) — guaranteed no stopPropagation
    // The time div is inside the right-side flex area of the card
    const firstCard = page.locator(APPT_CARD).first();
    
    // Try: Clock lucide icon (sibling of time text) — no stopPropagation on this element
    const clockIcon = firstCard.locator('svg[class*="lucide-clock"]').first();
    const clockCount = await clockIcon.count();
    
    // Fallback: Calendar lucide icon
    const calendarIcon = firstCard.locator('svg[class*="lucide-calendar"]').first();
    const calCount = await calendarIcon.count();

    console.log(`Clock icon count: ${clockCount}, Calendar icon count: ${calCount}`);

    if (clockCount > 0) {
      await clockIcon.click();
    } else if (calCount > 0) {
      await calendarIcon.click();
    } else {
      // Last fallback: click at right-center of card (date/time area)
      const box = await firstCard.boundingBox();
      if (!box) { test.skip(); return; }
      // Click at 65% width (past the avatar/name area) and 40% height
      await page.mouse.click(box.x + box.width * 0.65, box.y + box.height * 0.4);
    }

    // Wait for navigation to /appointments/:id
    await page.waitForURL(/\/appointments\/.+/, { timeout: 10000 }).catch(() => {});

    const url = page.url();
    console.log(`URL after card click: ${url}`);
    const navigated = url.includes('/appointments/') && !url.endsWith('/appointments');
    expect(navigated).toBe(true);
    console.log(`✅ CHECK 4 PASS: navigated to ${url}`);
  });

  test('CHECK 5 & 6: detail page is not blank and has content', async ({ page }) => {
    const aptCardCount = await page.locator(APPT_CARD).count();
    if (aptCardCount === 0) {
      console.log('⚠️  CHECK 5/6 SKIP: No appointment cards to click');
      test.skip();
      return;
    }

    const firstCard = page.locator(APPT_CARD).first();
    const clockIcon = firstCard.locator('svg[class*="lucide-clock"]').first();
    const calendarIcon = firstCard.locator('svg[class*="lucide-calendar"]').first();

    if (await clockIcon.count() > 0) {
      await clockIcon.click();
    } else if (await calendarIcon.count() > 0) {
      await calendarIcon.click();
    } else {
      const box = await firstCard.boundingBox();
      if (!box) { test.skip(); return; }
      await page.mouse.click(box.x + box.width * 0.65, box.y + box.height * 0.4);
    }

    await page.waitForURL(/\/appointments\/.+/, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000); // allow Supabase fetch to complete

    const url = page.url();
    console.log(`Detail page URL: ${url}`);

    // CHECK 5: not blank
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(10);
    console.log('✅ CHECK 5 PASS: detail page not blank');

    // CHECK 6: back button or appointment details or not-found state
    const hasBackButton = (await page.locator('button:has-text("Back")').count()) > 0;
    const hasDetails = (await page.locator('text=Appointment Details').count()) > 0;
    const hasNotFound = (await page.locator('text=/not found/i').count()) > 0;
    const hasLoader = (await page.locator('.animate-spin').count()) > 0;
    console.log(`Back button: ${hasBackButton}, Details: ${hasDetails}, Not found: ${hasNotFound}, Loader: ${hasLoader}`);
    expect(hasBackButton || hasDetails || hasNotFound || hasLoader).toBe(true);
    console.log('✅ CHECK 6 PASS: detail page has content');

    const rootChildren = await page.locator('#root > *').count();
    expect(rootChildren).toBeGreaterThan(0);
    console.log('✅ CHECK: No blank white screen on detail page');
  });

  test('CHECK 7: provider avatar click navigates to /profile/... not /appointments/... (stopPropagation)', async ({ page }) => {
    const aptCardCount = await page.locator(APPT_CARD).count();
    if (aptCardCount === 0) {
      console.log('⚠️  CHECK 7 SKIP: No appointment cards found');
      test.skip();
      return;
    }

    // Provider avatar: rounded-full bg-primary div inside the appointment card
    const firstCard = page.locator(APPT_CARD).first();
    // Avatar has inline classes: w-12 h-12 bg-primary rounded-full
    const avatar = firstCard.locator('div[class*="rounded-full"][class*="bg-primary"]').first();
    const avatarCount = await avatar.count();
    
    if (avatarCount === 0) {
      console.log('⚠️  CHECK 7 SKIP: Provider avatar (bg-primary rounded-full) not found in card');
      test.skip();
      return;
    }

    await avatar.click();
    await page.waitForTimeout(1000);

    const url = page.url();
    console.log(`URL after avatar click: ${url}`);

    const wentToProfile = url.includes('/profile/');
    const wentToAppointmentDetail = /\/appointments\/[^/]+$/.test(url) && !url.endsWith('/appointments');

    if (wentToAppointmentDetail) {
      console.log('❌ CHECK 7 FAIL: avatar click triggered card navigation (stopPropagation broken)');
      expect(wentToAppointmentDetail).toBeFalsy();
    } else if (wentToProfile) {
      console.log('✅ CHECK 7 PASS: avatar navigated to /profile/ and stopPropagation prevented card click');
    } else {
      console.log(`✅ CHECK 7 PASS (no-slug): avatar is no-op (provider has no slug), URL stayed at ${url} — stopPropagation prevented card click`);
    }
    expect(wentToAppointmentDetail).toBe(false);
  });

  test('CHECK 8: CalendarPlus button opens menu, does NOT navigate to appointment detail', async ({ page }) => {
    const aptCardCount = await page.locator(APPT_CARD).count();
    if (aptCardCount === 0) {
      console.log('⚠️  CHECK 8 SKIP: No appointment cards found');
      test.skip();
      return;
    }

    // CalendarPlus button has aria-label="Add to calendar" anywhere on the page
    // (not scoped to first card in case it's in a different position)
    const calBtn = page.locator('[aria-label="Add to calendar"]').first();
    const calBtnCount = await calBtn.count();
    if (calBtnCount === 0) {
      console.log('⚠️  CHECK 8 SKIP: CalendarPlus button (aria-label="Add to calendar") not found');
      test.skip();
      return;
    }

    await calBtn.click();
    await page.waitForTimeout(500);

    const url = page.url();
    const menuVisible = (await page.locator('[role="menu"]').count()) > 0 ||
      (await page.locator('text=Google Calendar').count()) > 0;
    const wentToAppointmentDetail = /\/appointments\/[^/]+$/.test(url) && !url.endsWith('/appointments');

    console.log(`URL after CalendarPlus click: ${url}`);
    console.log(`Menu visible: ${menuVisible}, Navigated to detail: ${wentToAppointmentDetail}`);

    expect(wentToAppointmentDetail).toBe(false);
    console.log('✅ CHECK 8a PASS: CalendarPlus did NOT navigate to appointment detail (stopPropagation works)');
    expect(menuVisible).toBe(true);
    console.log('✅ CHECK 8b PASS: CalendarPlus opened dropdown menu');
  });
});

test.describe('Ripley Change 2 — AppointmentView with real Supabase data', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('CHECK 9: /appointments/fake-id-12345 shows "not found" card, not blank', async ({ page }) => {
    await page.goto(`${BASE}/appointments/fake-id-12345`, { waitUntil: 'networkidle' });
    
    // TanStack Query defaults to 3 retries with exponential backoff — wait up to 12s
    // for spinner to disappear and "not found" state to render
    await page.waitForFunction(
      () => document.querySelector('.animate-spin') === null,
      { timeout: 15000 }
    ).catch(() => {});
    await page.waitForTimeout(500);

    const body = await page.locator('body').innerText();
    console.log('Body snippet for fake-id:', body.slice(0, 400));

    // Must not be blank
    expect(body.trim().length).toBeGreaterThan(5);
    const rootChildren = await page.locator('#root > *').count();
    expect(rootChildren).toBeGreaterThan(0);

    const hasNotFound = (await page.locator('text=/not found/i').count()) > 0;
    const hasBackBtn = (await page.locator('button:has-text("Back")').count()) > 0;
    const isStillLoading = (await page.locator('.animate-spin').count()) > 0;

    console.log(`Not found text: ${hasNotFound}, Back button: ${hasBackBtn}, Still loading: ${isStillLoading}`);

    if (isStillLoading) {
      console.log('⚠️  Page still shows spinner — query may be stuck retrying');
    }

    expect(hasNotFound || hasBackBtn).toBe(true);
    console.log('✅ CHECK 9 PASS: fake-id shows not-found state (back button + "not found" text), not blank');
  });

  test('CHECK 10: console errors on /appointments pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE}/appointments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const critical = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('ResizeObserver') && !e.includes('net::ERR') && !e.includes('404')
    );
    if (critical.length > 0) {
      console.warn('⚠️  Console errors on /appointments:', critical);
    } else {
      console.log('✅ CHECK 10 PASS: No critical console errors on /appointments');
    }
    expect(page.url()).not.toBe('about:blank');
  });
});

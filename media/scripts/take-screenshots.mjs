import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://127.0.0.1:4173';
const VIEWPORT = { width: 1920, height: 1080 };

/**
 * Navigate and screenshot a page.
 * Uses 'load' (not 'networkidle') because Supabase WebSockets keep the
 * connection open and prevent networkidle from ever firing.
 * After load we wait for a selector that proves React has rendered.
 */
async function shot(page, name, url, { fullPage = true, readySelector = 'main, [role="main"], #root > div', extraWait = 2000 } = {}) {
  console.log(`→ ${name}: ${url}`);
  await page.goto(url, { waitUntil: 'load', timeout: 25000 });
  // Wait for React to mount something inside #root
  await page.waitForFunction(
    () => document.querySelector('#root')?.children?.length > 0,
    { timeout: 10000 }
  ).catch(() => {});
  // Wait for the specific content selector
  await page.waitForSelector(readySelector, { timeout: 10000 }).catch(() => {});
  // Extra settle for animations / data fetches
  await page.waitForTimeout(extraWait);
  const file = join(OUT_DIR, name);
  await page.screenshot({ path: file, fullPage });
  const { size } = (await import('fs')).statSync(file);
  console.log(`  ✓ ${file} (${Math.round(size / 1024)}KB)`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  // Suppress console noise from the app
  page.on('console', () => {});

  // 01 — Auth page (most visually rich unauthenticated page)
  // Auth page renders a full-screen card with tabs: Sign In / Sign Up / Reset
  await shot(page, '01-auth.png', BASE + '/auth', {
    readySelector: '[role="tablist"]',
    extraWait: 2500,
  });

  // 02 — Browse / provider listing (unauthenticated landing for regular users)
  // Shows all available appointment slots / providers
  await shot(page, '02-browse.png', BASE + '/browse', {
    readySelector: 'input[type="text"], h2, h1',
    extraWait: 3000,
  });

  // 03 — Dashboard (org view — redirects to /auth if not logged in, capture anyway)
  await shot(page, '03-dashboard.png', BASE + '/dashboard', {
    readySelector: 'h1, h2, [class*="card"], [role="tablist"]',
    extraWait: 2500,
  });

  // 04 — Appointments list
  await shot(page, '04-appointments.png', BASE + '/appointments', {
    readySelector: 'h1, h2, table, [class*="card"]',
    extraWait: 2500,
  });

  // 05 — Calendar view
  await shot(page, '05-calendar.png', BASE + '/calendar', {
    readySelector: '[class*="calendar"], table, h1, h2',
    extraWait: 2500,
  });

  // 06 — Settings / subscription / premium upgrade
  await shot(page, '06-settings-premium.png', BASE + '/settings', {
    readySelector: '[role="tablist"], h1, h2',
    extraWait: 2500,
  });

  // 07 — Profile page
  await shot(page, '07-profile.png', BASE + '/profile', {
    readySelector: 'h1, h2, form, [class*="card"]',
    extraWait: 2500,
  });

  // 08 — Root redirect (shows where unauthenticated users land)
  await shot(page, '08-landing.png', BASE + '/', {
    readySelector: 'h1, h2, input, [class*="card"]',
    extraWait: 3000,
  });

  await browser.close();
  console.log('\n✅ Done! Screenshots saved to:', OUT_DIR);
})();

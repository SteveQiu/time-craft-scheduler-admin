/**
 * Validates location gate + browse filtering changes.
 * Run with: node scripts/validate-location-gate.cjs
 * Requires a running dev server on http://127.0.0.1:8080/
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const snapshotDir = path.join(__dirname, '..', 'tmp-snapshots');
if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });

const FAKE_USER_ID = 'test-validation-user-1';
const AUTH_KEY = 'sb-dbabjfydcllqbjpolhym-auth-token';
const fakeSession = JSON.stringify({
  access_token: 'fake-validate-token',
  refresh_token: 'fake-refresh',
  expires_in: 9999,
  expires_at: Math.floor(Date.now() / 1000) + 9999,
  token_type: 'bearer',
  user: {
    id: FAKE_USER_ID,
    email: 'validate@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
});

const LOCATION_KEY = `locationPreference_${FAKE_USER_ID}`;
const fakeLocation = JSON.stringify({ city: 'Toronto', country: 'Canada' });

let passed = 0;
let failed = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  try {
    // ─── TEST 1: Anonymous user → browse works, no gate ───────────────────
    console.log('\n[1] Anonymous user → browse should load');
    const page1 = await browser.newPage();
    page1.on('pageerror', err => errors.push(`T1: ${err.message}`));
    await page1.goto('http://127.0.0.1:8080/browse', { waitUntil: 'networkidle', timeout: 15000 });
    await page1.screenshot({ path: path.join(snapshotDir, 'validate-1-anon-browse.png'), fullPage: true });
    const t1url = page1.url();
    const t1text = await page1.evaluate(() => document.body.innerText.trim().substring(0, 500));
    check('URL stays on /browse', t1url.includes('/browse'), t1url);
    check('No setup screen shown', !t1text.includes('Set your browsing location'), t1text.substring(0, 100));
    check('Page renders content', t1text.length > 50, `length=${t1text.length}`);
    await page1.close();

    // ─── TEST 2: Authenticated user WITH location → no setup gate ──────────
    console.log('\n[2] Signed-in user WITH location → app loads normally');
    const page2 = await browser.newPage();
    page2.on('pageerror', err => errors.push(`T2: ${err.message}`));
    await page2.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page2.evaluate(({ authKey, session, locKey, loc }) => {
      localStorage.setItem(authKey, session);
      localStorage.setItem(locKey, loc);
    }, { authKey: AUTH_KEY, session: fakeSession, locKey: LOCATION_KEY, loc: fakeLocation });
    await page2.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await page2.screenshot({ path: path.join(snapshotDir, 'validate-2-with-location.png'), fullPage: true });
    const t2text = await page2.evaluate(() => document.body.innerText.trim().substring(0, 500));
    check('Setup screen NOT shown', !t2text.includes('Set your browsing location'), t2text.substring(0, 150));
    check('App renders content', t2text.length > 50, `length=${t2text.length}`);
    await page2.close();

    // ─── TEST 3: Authenticated user WITHOUT location → setup gate shown ────
    console.log('\n[3] Signed-in user WITHOUT location → setup screen required');
    const page3 = await browser.newPage();
    page3.on('pageerror', err => errors.push(`T3: ${err.message}`));
    await page3.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page3.evaluate(({ authKey, session, locKey }) => {
      localStorage.setItem(authKey, session);
      localStorage.removeItem(locKey);
    }, { authKey: AUTH_KEY, session: fakeSession, locKey: LOCATION_KEY });
    await page3.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await page3.screenshot({ path: path.join(snapshotDir, 'validate-3-no-location.png'), fullPage: true });
    const t3text = await page3.evaluate(() => document.body.innerText.trim().substring(0, 600));
    check('Setup screen IS shown', t3text.includes('Set your browsing location'), t3text.substring(0, 200));
    check('City input present', t3text.includes('City') || t3text.includes('city'), t3text.substring(0, 200));
    check('Continue button present', t3text.includes('Continue'), t3text.substring(0, 200));
    await page3.close();

    // ─── TEST 4: Complete setup → gate dismisses ───────────────────────────
    console.log('\n[4] Completing setup → gate dismisses and app loads');
    const page4 = await browser.newPage();
    page4.on('pageerror', err => errors.push(`T4: ${err.message}`));
    await page4.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page4.evaluate(({ authKey, session, locKey }) => {
      localStorage.setItem(authKey, session);
      localStorage.removeItem(locKey);
    }, { authKey: AUTH_KEY, session: fakeSession, locKey: LOCATION_KEY });
    await page4.reload({ waitUntil: 'networkidle', timeout: 15000 });
    // Fill city
    const cityInput = page4.locator('input[placeholder="Enter city"]');
    await cityInput.fill('Vancouver');
    // Select country
    const countryTrigger = page4.locator('[role="combobox"]').first();
    await countryTrigger.click();
    await page4.waitForTimeout(500);
    const canadaOption = page4.locator('[role="option"]', { hasText: 'Canada' }).first();
    await canadaOption.click();
    // Click Continue
    await page4.locator('button', { hasText: 'Continue' }).click();
    await page4.waitForTimeout(2000);
    await page4.screenshot({ path: path.join(snapshotDir, 'validate-4-after-setup.png'), fullPage: true });
    const t4text = await page4.evaluate(() => document.body.innerText.trim().substring(0, 500));
    const t4loc = await page4.evaluate((key) => localStorage.getItem(key), LOCATION_KEY);
    check('Setup screen dismissed', !t4text.includes('Set your browsing location'), t4text.substring(0, 150));
    check('Location saved to localStorage', !!t4loc && t4loc.includes('Vancouver'), t4loc || 'null');
    await page4.close();

  } finally {
    if (errors.length) {
      console.log('\n⚠️  Page errors encountered:');
      errors.forEach(e => console.log('  ', e));
    }
    await browser.close();
    console.log(`\n══════════════════════════════`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`Screenshots: ${snapshotDir}`);
    if (failed > 0) process.exit(1);
  }
})();

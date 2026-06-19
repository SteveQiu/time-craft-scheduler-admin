const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const https = require('https');

const secretPath = path.join(__dirname, '..', '.secret');
const secret = {};
if (fs.existsSync(secretPath)) {
  fs.readFileSync(secretPath, 'utf8').split(/\r?\n/).forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) secret[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  });
}

const EMAIL = secret['TESTER1_EMAIL'];
const PASS  = secret['TESTER1_PASSWORD1'];
const BASE  = 'http://localhost:8080';
const SNAP  = path.join(__dirname, '..', 'tmp-snapshots');
if (!fs.existsSync(SNAP)) fs.mkdirSync(SNAP, { recursive: true });

const SUPABASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co';
const SUPABASE_ANON_KEY = secret['SUPABASE_Publishable_KEY'];
if (!SUPABASE_ANON_KEY) { console.error('Missing SUPABASE_Publishable_KEY in .secret'); process.exit(1); }
const PROJECT_REF = 'dbabjfydcllqbjpolhym';

function supabaseSignIn(email, password) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password });
    const url = new URL(`${SUPABASE_URL}/auth/v1/token?grant_type=password`);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function injectSession(page, session) {
  const storageKey = `sb-${PROJECT_REF}-auth-token`;
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: storageKey,
    value: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: session.user,
    }
  });
}

(async () => {
  // Sign in via API (bypass CAPTCHA)
  console.log('Signing in via Supabase API as', EMAIL);
  const session = await supabaseSignIn(EMAIL, PASS);
  if (session.error) { console.error('Auth failed:', session.error_description || session.error); process.exit(1); }
  console.log('Auth response:', JSON.stringify(session).substring(0, 200));
  if (!session.access_token) { console.error('No access_token:', session.msg || session.error_code); process.exit(1); }
  console.log('Auth OK, user:', session.user?.email);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  // Open app then inject session
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await injectSession(page, session);
  // Reload to trigger app to pick up session from localStorage
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Navigate directly to provider page
  const providerId = 'f0927dd8-9e7d-4830-a6b5-c96a3c627fe9';
  console.log('Navigating to provider page...');
  await page.goto(`${BASE}/browse/${providerId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SNAP, 'browse-provider.png') });

  const pageText = await page.evaluate(() => document.body.innerText.trim().substring(0, 400));
  console.log('Provider page text:', pageText || '(blank)');

  // Click first "Book" button
  const bookBtns = page.locator('button').filter({ hasText: /^book$/i });
  const bookCount = await bookBtns.count();
  console.log('Book buttons found:', bookCount);

  if (bookCount === 0) {
    console.log('ERROR: No Book button. Checking all buttons:');
    const allBtns = await page.locator('button').allInnerTexts();
    console.log(allBtns);
    await page.screenshot({ path: path.join(SNAP, 'browse-no-book.png') });
    await browser.close();
    process.exit(1);
  }

  await bookBtns.first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SNAP, 'browse-booking-dialog.png') });

  // Get dialog text
  const dialogText = await page.locator('[role="alertdialog"], [role="dialog"]').first().innerText().catch(() => '');
  console.log('\n=== Booking Dialog Text ===');
  console.log(dialogText);
  console.log('===========================\n');

  const hasPayment = /payment/i.test(dialogText);
  console.log('Payment methods shown:', hasPayment ? 'YES ✅' : 'NO ❌');

  await browser.close();
  process.exit(hasPayment ? 0 : 1);
})();


const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Read credentials from .secret
const secretPath = path.join(__dirname, '..', '.secret');
const secret = {};
if (fs.existsSync(secretPath)) {
  fs.readFileSync(secretPath, 'utf8').split(/\r?\n/).forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) secret[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  });
}

// Use TESTER3+ as real accounts (skip test dummies 1-2)
const TESTERS = [];
for (let i = 3; i <= 9; i++) {
  const email = secret[`TESTER${i}_EMAIL`];
  const pass = secret[`TESTER${i}_PASSWORD1`];
  if (email && pass) TESTERS.push({ email, password: pass, label: email.split('@')[0] });
  if (TESTERS.length >= 2) break;
}
if (!TESTERS.length) {
  console.error('ERROR: No TESTER3_EMAIL/TESTER3_PASSWORD1 in .secret');
  process.exit(1);
}

const SUPABASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co';
const SUPABASE_ANON_KEY = secret['SUPABASE_Publishable_KEY'] ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYWJqZnlkY2xscWJqcG9saHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzk1OTYsImV4cCI6MjA2ODYxNTU5Nn0.SyYn3n9-sA9A2gwoIgY06oHHRg8Lfw1p3XNjV7Dadys';
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
  const browser = await chromium.launch({ headless: true });
  const screenshotDir = path.join(__dirname, '..', 'tmp-snapshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  // Sign in via API for both users (credentials from .secret)
  for (const user of TESTERS) {
    console.log(`\n=== Testing as ${user.label} ===`);
    console.log(`1. Signing in via API...`);
    let session;
    try {
      session = await supabaseSignIn(user.email, user.password);
      if (session.error) throw new Error(session.error_description || session.error);
      console.log('   Auth OK, user:', session.user?.email);
    } catch (e) {
      console.error('   Auth FAILED:', e.message);
      continue;
    }

    const page = await browser.newPage();
    page.setDefaultTimeout(20000);

    const snap = (name) => page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });

    // Collect browser errors
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}`));

    try {
      // Open app first to set localStorage on correct origin
      console.log('2. Opening app to set session...');
      await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
      await injectSession(page, session);

      // Navigate to appointments
      console.log('3. Going to /appointments...');
      await page.goto('http://localhost:8080/appointments', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
      await snap(`${user.label}-appointments`);
      const text1 = await page.evaluate(() => document.body.innerText.trim().substring(0, 600));
      console.log(`   URL: ${page.url()}`);
      console.log(`   Text: ${text1 || '(blank)'}`);

      // Org mode
      console.log('4. Going to /appointments?mode=org...');
      await page.goto('http://localhost:8080/appointments?mode=org', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
      await snap(`${user.label}-appointments-org`);
      const text2 = await page.evaluate(() => document.body.innerText.trim().substring(0, 600));
      console.log(`   URL: ${page.url()}`);
      console.log(`   Text: ${text2 || '(blank)'}`);

      // Workers route
      console.log('5. Going to /workers...');
      await page.goto('http://localhost:8080/workers', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
      await snap(`${user.label}-workers`);
      const text3 = await page.evaluate(() => document.body.innerText.trim().substring(0, 600));
      console.log(`   URL: ${page.url()}`);
      console.log(`   Text: ${text3 || '(blank)'}`);

    } catch (err) {
      await snap(`${user.label}-error`);
      console.error('ERROR:', err.message);
    }

    if (errors.length) {
      console.log('\nBrowser errors:');
      errors.forEach(e => console.log(' -', e));
    }

    await page.close();
  }

  await browser.close();
  console.log('\nAll snapshots saved to tmp-snapshots/');
})();

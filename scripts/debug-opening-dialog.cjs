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

const email = secret['TESTER3_EMAIL'];
const password = secret['TESTER3_PASSWORD1'];
if (!email || !password) { console.error('Missing TESTER3 creds in .secret'); process.exit(1); }

const SUPABASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co';
const SUPABASE_ANON_KEY = secret['SUPABASE_Publishable_KEY'];
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
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
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
  console.log(`Signing in as ${email}...`);
  const session = await supabaseSignIn(email, password);
  if (session.error) { console.error('Auth FAILED:', session.error_description); process.exit(1); }
  console.log('Auth OK');

  const browser = await chromium.launch({ headless: true });
  const screenshotDir = path.join(__dirname, '..', 'tmp-snapshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const snap = (page, name) => page.screenshot({ path: path.join(screenshotDir, `debug-${name}.png`), fullPage: true });

  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}`));

  try {
    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
    await injectSession(page, session);

    console.log('Going to /openings...');
    await page.goto('http://localhost:8080/openings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await snap(page, 'openings-page');
    console.log('Page text:', (await page.evaluate(() => document.body.innerText.trim().substring(0, 400))));

    // Click "Add Opening" button
    console.log('\nLooking for Add Opening button...');
    const addBtn = await page.locator('button:has-text("Add Opening"), button:has-text("Add")').first();
    if (await addBtn.isVisible()) {
      console.log('Found Add Opening button, clicking...');
      await addBtn.click();
      await page.waitForTimeout(2000);
      await snap(page, 'dialog-opened');

      // Print dialog content
      const dialogText = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        return d ? d.innerText : 'NO DIALOG FOUND';
      });
      console.log('\nDialog content:\n', dialogText);

      // Check if Service section exists
      const serviceLabel = await page.locator('text=Service').first();
      if (await serviceLabel.isVisible()) {
        console.log('\nService label FOUND');
        // Get the service section HTML
        const serviceHtml = await page.evaluate(() => {
          const labels = Array.from(document.querySelectorAll('label'));
          const serviceLabel = labels.find(l => l.textContent.trim() === 'Service');
          if (!serviceLabel) return 'No Service label found';
          const parent = serviceLabel.closest('.space-y-2') || serviceLabel.parentElement;
          return parent ? parent.innerHTML : 'No parent found';
        });
        console.log('\nService section HTML:\n', serviceHtml);
      } else {
        console.log('\nService label NOT VISIBLE');
      }

      // Open the Service dropdown specifically
      console.log('\nOpening Service dropdown...');
      try {
        // Use Playwright locator to find the Service combobox
        const serviceSection = page.locator('.space-y-2', { has: page.locator('label:has-text("Service")') });
        const serviceBtn = serviceSection.locator('button[role="combobox"]');
        const count = await serviceBtn.count();
        console.log('Service combobox count:', count);

        if (count > 0) {
          await serviceBtn.click();
          // Wait for the combobox to actually open
          await page.waitForFunction(() => {
            const btn = document.querySelector('button[role="combobox"][aria-expanded="true"]');
            return btn !== null;
          }, { timeout: 5000 }).catch(() => console.log('Combobox did not open (timeout)'));
          await page.waitForTimeout(500);
          await snap(page, 'dialog-service-dropdown-open');

          // Dump full portal HTML when open
          const portalHtml = await page.evaluate(() => {
            const portal = document.querySelector('[data-radix-popper-content-wrapper]');
            return portal ? portal.innerHTML.substring(0, 3000) : 'No portal';
          });
          console.log('\nPortal HTML (truncated):\n', portalHtml);
          
          // Search for "__add_new__" ANYWHERE in DOM
          const addNewInDom = await page.evaluate(() => {
            const body = document.body.innerHTML;
            const idx = body.indexOf('__add_new__');
            if (idx === -1) return 'NOT FOUND in DOM';
            return 'FOUND at index ' + idx + ': ...' + body.substring(idx - 50, idx + 100) + '...';
          });
          console.log('\n__add_new__ in DOM:', addNewInDom);
          
          // Get all option texts
          const allOptions = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('[role="option"]'));
            return items.map(i => i.textContent.trim());
          });
          console.log('All Service options:', allOptions);
        } else {
          // Check if inline input (showAddService=true) is shown instead
          const inputs = await serviceSection.locator('input').count();
          console.log('Inline inputs in Service section:', inputs);
        }
      } catch (e) {
        console.log('Service dropdown error:', e.message);
      }
    } else {
      console.log('Add Opening button NOT found');
      const buttons = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).slice(0, 20)
      );
      console.log('Buttons on page:', buttons);
    }
  } catch (err) {
    await snap(page, 'error');
    console.error('ERROR:', err.message);
  }

  if (errors.length) {
    console.log('\nBrowser errors:');
    errors.forEach(e => console.log(' -', e));
  }

  await browser.close();
  console.log('\nSnapshots saved to tmp-snapshots/');
})();

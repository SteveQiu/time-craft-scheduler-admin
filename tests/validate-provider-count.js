import { firefox } from 'playwright';

const browser = await firefox.launch({ headless: false });
const page = await browser.newPage();
await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'aaa@aaa.com');
await page.fill('input[type="password"]', 'aaaaaa');
await page.click('button:has-text("Sign In")');
await page.waitForTimeout(1500);
await page.goto('http://localhost:8080/browse', { waitUntil: 'networkidle' });
const header = await page.locator('.flex.items-center.justify-between').textContent();
console.log('✅ Header updated:', header?.replace(/\s+/g, ' ').trim());
await page.screenshot({ path: 'firefox-validation-screenshots/header-provider-only.png' });
console.log('✅ Screenshot saved');
await browser.close();

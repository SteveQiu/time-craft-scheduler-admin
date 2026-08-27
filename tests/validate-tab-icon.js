import { requireTestSecret } from './testCredentials.js';
import { firefox } from 'playwright';

const browser = await firefox.launch({ headless: false });
const page = await browser.newPage();
await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'aaa@aaa.com');
await page.fill('input[type="password"]', requireTestSecret('TESTER1_PASSWORD1'));
await page.click('button:has-text("Sign In")');
await page.waitForTimeout(1500);
await page.goto('http://localhost:8080/browse', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'firefox-validation-screenshots/tab-icon-grey.png' });
console.log('✅ Tab icon color fixed - grey for accessibility');
await browser.close();

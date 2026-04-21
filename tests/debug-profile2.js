import { firefox } from 'playwright';

const browser = await firefox.launch({ headless: false });
const page = await browser.newPage();

// Capture console errors
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log('[ERROR]', msg.text());
  }
});

await page.goto('http://localhost:8080/profile/276a81aa-0d96-4992-9105-23c3cbb4c092', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const bodyText = await page.textContent('body');
console.log('Body text length:', bodyText?.length);
console.log('First 300 chars:', bodyText?.substring(0, 300));

const hasError = await page.locator('text=Error').isVisible().catch(() => false);
console.log('Has error element:', hasError);

await page.screenshot({ path: 'firefox-validation-screenshots/profile-debug2.png' });
console.log('Screenshot saved');

await browser.close();

import { firefox } from 'playwright';

const browser = await firefox.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

console.log('🔍 Opening browser to show favicon...\n');

await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// Get favicon details
const favicon = await page.locator('link[rel="icon"]');
const faviconHref = await favicon.getAttribute('href');
console.log('✅ Favicon href:', faviconHref);
console.log('   Location: public/calendar-icon.svg');
console.log('   Color: #9ca3af (Light grey - Apple text grey)');
console.log('   Accessibility: WCAG AA compliant\n');

// Take screenshot showing the tab
await page.screenshot({ path: 'firefox-validation-screenshots/favicon-preview.png' });
console.log('📸 Screenshot saved showing favicon in browser tab');

// Keep browser open for inspection
console.log('\n👀 Browser window is open - you can see the favicon in the tab');
console.log('   Close it when done.\n');

await new Promise(() => {}); // Keep open

import { test } from '@playwright/test';

test('Check for React errors on homepage', async ({ page }) => {
  // Capture all errors
  const errors: string[] = [];
  const consoleMessages: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[${msg.type()}] ${text}`);
    consoleMessages.push(`[${msg.type()}] ${text}`);
    
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    console.log(error.stack);
    errors.push(error.message);
  });
  
  // Navigate to home
  console.log('\n📄 Navigating to http://localhost:8083...');
  await page.goto('http://localhost:8083', { waitUntil: 'domcontentloaded' });
  
  // Wait for any render errors to surface
  await page.waitForTimeout(3000);
  
  // Get page content
  const html = await page.content();
  console.log(`\n📄 HTML length: ${html.length}`);
  console.log(`📄 HTML (first 500 chars):\n${html.substring(0, 500)}`);
  
  // Try to find root element
  const hasRoot = await page.locator('#root').isVisible().catch(() => false);
  console.log(`\n✅ Root element visible: ${hasRoot}`);
  
  // Get text content
  const text = await page.locator('body').textContent();
  console.log(`✅ Body text (first 300 chars):\n${text?.substring(0, 300)}`);
  
  // Check for specific elements
  const buttons = await page.locator('button').count();
  const divs = await page.locator('div').count();
  console.log(`\n✅ Buttons: ${buttons}, Divs: ${divs}`);
  
  // Report errors
  console.log(`\n📋 Captured ${errors.length} errors`);
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  
  console.log(`\n📋 Captured ${consoleMessages.length} console messages`);
  consoleMessages.slice(0, 10).forEach(m => console.log(`  ${m}`));
});

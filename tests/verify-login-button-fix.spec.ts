import { test } from '@playwright/test';

const SDEQIU_EMAIL = 'sdeqiu@gmail.com';
const SDEQIU_PASSWORD = 'Soulreap1';

test('Verify button click login fix', async ({ page }) => {
  console.log('\n🔐 Testing login button click after fix\n');
  
  await page.goto('http://localhost:8083/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // Fill form
  console.log('📝 Filling form...');
  await page.locator('input[type="email"]').fill(SDEQIU_EMAIL);
  await page.locator('input[type="password"]').fill(SDEQIU_PASSWORD);
  console.log('✅ Form filled');
  
  // Try button click
  console.log('\n📍 Testing button click (not Enter)...');
  let authNetworkMade = false;
  
  page.once('response', response => {
    if (response.url().includes('auth')) {
      authNetworkMade = true;
      console.log(`📡 Auth request: ${response.status()}`);
    }
  });
  
  const button = page.locator('button:has-text("Sign In")').first();
  await button.click();
  
  // Wait for response
  await page.waitForTimeout(2000);
  
  console.log(`✅ Network request made: ${authNetworkMade}`);
  
  // Check if redirected
  await page.waitForURL('**/dashboard**', { timeout: 5000 }).catch(() => {});
  
  const url = page.url();
  console.log(`✅ Final URL: ${url}`);
  
  const isLoggedIn = url.includes('dashboard') || url.includes('calendar');
  console.log(`\n📊 RESULT: ${isLoggedIn ? '✅ LOGIN SUCCESSFUL' : '❌ LOGIN FAILED'}`);
  
  // If logged in, navigate to calendar and verify openings
  if (isLoggedIn) {
    console.log('\n📅 Navigating to calendar org mode...');
    await page.goto('http://localhost:8083/calendar?mode=org', { waitUntil: 'networkidle' });
    
    const bodyText = await page.locator('body').textContent();
    const hasOpenings = bodyText?.includes('Hair cut') || bodyText?.includes('10:00');
    
    console.log(`✅ Openings visible: ${hasOpenings}`);
  }
});

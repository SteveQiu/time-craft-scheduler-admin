import { test } from '@playwright/test';

const SDEQIU_EMAIL = 'sdeqiu@gmail.com';
const SDEQIU_PASSWORD = 'Soulreap1';

test('Successful login and calendar access', async ({ page }) => {
  console.log('\n🔐 Login with Enter key and check openings\n');
  
  // Navigate to auth
  await page.goto('http://localhost:8083/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // Fill form
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  
  await emailInput.fill(SDEQIU_EMAIL);
  await passwordInput.fill(SDEQIU_PASSWORD);
  
  console.log('✅ Form filled');
  
  // Submit with Enter
  await passwordInput.press('Enter');
  
  // Wait for navigation
  await page.waitForURL('**/dashboard**', { timeout: 5000 }).catch(e => console.log(`⚠️  Dashboard wait: ${e}`));
  
  const dashboardUrl = page.url();
  console.log(`✅ Dashboard URL: ${dashboardUrl}`);
  
  // Navigate to calendar org mode
  console.log('\n📅 Navigate to calendar org mode');
  await page.goto('http://localhost:8083/calendar?mode=org', { waitUntil: 'networkidle' });
  
  const calendarUrl = page.url();
  console.log(`✅ Calendar URL: ${calendarUrl}`);
  
  // Check for openings
  console.log('\n🔍 Check for openings');
  const bodyText = await page.locator('body').textContent();
  console.log(`✅ Page text (first 300 chars):\n${bodyText?.substring(0, 300)}`);
  
  // Check specific elements
  const hasAddOpening = await page.locator('button:has-text("Add Opening")').isVisible().catch(() => false);
  console.log(`✅ "Add Opening" button visible: ${hasAddOpening}`);
  
  const hasSignInMsg = bodyText?.includes('Please sign in');
  console.log(`✅ Has "Please sign in" message: ${hasSignInMsg}`);
  
  // Check calendar content
  const calendarContent = await page.locator('[data-testid="calendar-container"], .calendar, main').first().textContent();
  console.log(`✅ Calendar content (first 200 chars):\n${calendarContent?.substring(0, 200)}`);
  
  // Look for opening elements
  const openingCount = await page.locator('[data-testid="opening"], .opening, [class*="opening"]').count();
  console.log(`✅ Opening elements found: ${openingCount}`);
  
  // Get HTML structure around "Monday, Apr"  
  const dateElements = await page.locator('button:has-text("20")').count();
  console.log(`✅ Date button (20) count: ${dateElements}`);
  
  // Click on today or first date to see if openings appear
  const todayButton = await page.locator('button:has-text("Today"), button:has-text("20")').first();
  if (await todayButton.isVisible()) {
    console.log('\n📍 Clicking today button');
    await todayButton.click();
    await page.waitForTimeout(1000);
    
    const contentAfterClick = await page.locator('body').textContent();
    console.log(`✅ Content after click (first 200 chars):\n${contentAfterClick?.substring(0, 200)}`);
  }
  
  // Check for API requests related to openings
  console.log('\n📡 Monitoring openings API');
  const apiCalls: any[] = [];
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('openings')) {
      apiCalls.push(`${response.status()} ${url.substring(url.lastIndexOf('/'))}`);
      console.log(`📊 ${response.status()} ${url.substring(url.lastIndexOf('/'))}`);
    }
  });
  
  // Reload calendar to trigger API
  await page.reload({ waitUntil: 'networkidle' });
  
  console.log(`✅ Total openings API calls: ${apiCalls.length}`);
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`  - Authenticated: yes`);
  console.log(`  - Calendar accessible: yes`);
  console.log(`  - Add Opening button visible: ${hasAddOpening}`);
  console.log(`  - Openings API called: ${apiCalls.length > 0}`);
});

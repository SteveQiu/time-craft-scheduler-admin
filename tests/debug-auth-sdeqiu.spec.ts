import { requireTestSecret } from './testCredentials.js';
import { test } from '@playwright/test';

const SDEQIU_EMAIL = 'sdeqiu@gmail.com';
const SDEQIU_PASSWORD = requireTestSecret('TESTER3_PASSWORD1');

test('Debug Supabase auth and calendar access', async ({ page }) => {
  console.log('\n🔐 Testing Supabase Auth with sdeqiu credentials\n');
  
  // Capture auth-related logs
  const authLogs: string[] = [];
  page.on('console', msg => {
    if (msg.text().toLowerCase().includes('auth') || msg.text().toLowerCase().includes('error')) {
      console.log(`[${msg.type()}] ${msg.text()}`);
      authLogs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  
  // Navigate to login
  console.log('📍 Step 1: Navigate to login page');
  await page.goto('http://localhost:8083/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  const title = await page.title();
  const url = page.url();
  console.log(`✅ Title: ${title}`);
  console.log(`✅ URL: ${url}`);
  
  // Get login form text
  const formText = await page.locator('main, [role="main"], form').first().textContent();
  console.log(`✅ Form content (first 200 chars): ${formText?.substring(0, 200)}`);
  
  // Fill email
  console.log('\n📍 Step 2: Fill email field');
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(SDEQIU_EMAIL);
  await page.waitForTimeout(500);
  console.log(`✅ Email filled: ${SDEQIU_EMAIL}`);
  
  // Fill password
  console.log('\n📍 Step 3: Fill password field');
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(SDEQIU_PASSWORD);
  console.log(`✅ Password filled`);
  
  // Monitor network requests during login
  console.log('\n📍 Step 4: Monitoring network requests and submit login');
  
  const requests: any[] = [];
  page.on('response', response => {
    if (response.url().includes('auth') || response.url().includes('supabase')) {
      requests.push({
        url: response.url().substring(response.url().lastIndexOf('/')),
        status: response.status(),
      });
      console.log(`📡 ${response.status()} ${response.url().substring(response.url().lastIndexOf('/'))}`);
    }
  });
  
  // Click login button
  const loginBtn = page.locator('button:has-text("Sign In")').first();
  await loginBtn.click();
  console.log(`✅ Clicked Sign In button`);
  
  // Wait for response
  await page.waitForTimeout(3000);
  
  console.log(`\n📊 Network requests during login: ${requests.length}`);
  requests.forEach((r, i) => console.log(`  ${i + 1}. ${r.status} ${r.url}`));
  
  // Check current state
  console.log('\n📍 Step 5: Check result');
  const currentUrl = page.url();
  console.log(`✅ Current URL: ${currentUrl}`);
  
  // Check for error messages
  const errorMessages = await page.locator('[role="alert"], .error, [data-testid="error"], .text-red-500, .text-destructive').allTextContents();
  if (errorMessages.length > 0) {
    console.log(`⚠️  Error messages found:`);
    errorMessages.forEach(msg => console.log(`  - ${msg.trim().substring(0, 100)}`));
  }
  
  // Check for success (calendar redirect)
  const isLoggedIn = currentUrl.includes('calendar');
  console.log(`\n📊 Login result: ${isLoggedIn ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  // If still on auth page, get page content for debugging
  if (!isLoggedIn) {
    const bodyText = await page.locator('body').textContent();
    console.log(`\n🔍 Current page text (first 300 chars):\n${bodyText?.substring(0, 300)}`);
  }
  
  // Try to access calendar anyway
  console.log('\n📍 Step 6: Try direct calendar access');
  await page.goto('http://localhost:8083/calendar?mode=org', { waitUntil: 'networkidle' });
  
  const calendarText = await page.locator('body').textContent();
  console.log(`✅ Calendar page text (first 200 chars): ${calendarText?.substring(0, 200)}`);
  
  // Check if we see sign-in prompt or actual calendar
  const hasSignInPrompt = calendarText?.includes('Please sign in');
  console.log(`✅ Has "Please sign in" message: ${hasSignInPrompt}`);
  
  // Check for "Add Opening" button which only shows when authenticated
  const hasAddOpening = await page.locator('button:has-text("Add Opening")').isVisible().catch(() => false);
  console.log(`✅ "Add Opening" button visible (indicates auth): ${hasAddOpening}`);
  
  // Summary
  console.log('\n📋 SUMMARY:');
  console.log(`  - Auth logs captured: ${authLogs.length}`);
  console.log(`  - Can access calendar URL: yes`);
  console.log(`  - Authenticated: ${hasAddOpening}`);
  console.log(`  - Redirect after login: ${isLoggedIn}`);
});

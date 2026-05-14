import { chromium } from '@playwright/test';

async function manualVerification() {
  console.log('🔍 Starting manual Turnstile verification...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Monitor console for errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Go to auth page
  console.log('📄 Loading http://127.0.0.1:8081/auth');
  await page.goto('http://127.0.0.1:8081/auth');
  await page.waitForTimeout(2000);
  
  // Check current tab
  const signInTabVisible = await page.getByRole('tab', { name: 'Sign In' }).isVisible();
  const signUpTabVisible = await page.getByRole('tab', { name: 'Sign Up' }).isVisible();
  console.log(`✓ Sign In tab visible: ${signInTabVisible}`);
  console.log(`✓ Sign Up tab visible: ${signUpTabVisible}`);
  
  // Check signin form
  console.log('\n🔐 Checking SIGNIN form...');
  const signinEmailVisible = await page.locator('#signin-email').first().isVisible().catch(() => false);
  const signinPasswordVisible = await page.locator('#signin-password').first().isVisible().catch(() => false);
  console.log(`✓ Sign in email field visible: ${signinEmailVisible}`);
  console.log(`✓ Sign in password field visible: ${signinPasswordVisible}`);
  
  // Check for Turnstile iframe on signin tab
  const signinIframeCount = await page.locator('iframe[src*="turnstile"], iframe[src*="cloudflare"], iframe[title*="Widget"]').count();
  console.log(`✓ Turnstile iframes found: ${signinIframeCount}`);
  
  if (signinIframeCount > 0) {
    console.log('  → Turnstile widget IS rendering!');
  } else {
    console.log('  ⚠️  Turnstile widget NOT found (may be test key auto-passing)');
  }
  
  // Check signin button state
  const signinButton = page.getByRole('tabpanel', { name: 'Sign In' }).getByRole('button', { name: /sign in/i });
  const signinButtonDisabled = await signinButton.isDisabled();
  console.log(`✓ Sign in button disabled: ${signinButtonDisabled}`);
  
  // Switch to signup tab
  console.log('\n📝 Checking SIGNUP form...');
  await page.getByRole('tab', { name: 'Sign Up' }).click();
  await page.waitForTimeout(2000);
  
  const signupNameVisible = await page.locator('#signup-name').first().isVisible();
  const signupEmailVisible = await page.locator('#signup-email').first().isVisible();
  const signupPasswordVisible = await page.locator('#signup-password').first().isVisible();
  console.log(`✓ Sign up name field visible: ${signupNameVisible}`);
  console.log(`✓ Sign up email field visible: ${signupEmailVisible}`);
  console.log(`✓ Sign up password field visible: ${signupPasswordVisible}`);
  
  // Check for Turnstile iframe on signup tab
  const signupIframeCount = await page.locator('iframe[src*="turnstile"], iframe[src*="cloudflare"], iframe[title*="Widget"]').count();
  console.log(`✓ Turnstile iframes found: ${signupIframeCount}`);
  
  if (signupIframeCount > 0) {
    console.log('  → Turnstile widget IS rendering!');
  } else {
    console.log('  ⚠️  Turnstile widget NOT found (may be test key auto-passing)');
  }
  
  // Check signup button state
  const signupButton = page.getByRole('tabpanel', { name: 'Sign Up' }).getByRole('button', { name: /sign up/i });
  const signupButtonDisabled = await signupButton.isDisabled();
  console.log(`✓ Sign up button disabled: ${signupButtonDisabled}`);
  
  // Console errors
  console.log(`\n📋 Console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach(err => console.log(`  ⚠️  ${err}`));
  }
  
  // Take screenshots
  await page.screenshot({ path: 'test-results/manual-verify-signup.png', fullPage: true });
  console.log('\n📸 Screenshot saved: test-results/manual-verify-signup.png');
  
  await page.getByRole('tab', { name: 'Sign In' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/manual-verify-signin.png', fullPage: true });
  console.log('📸 Screenshot saved: test-results/manual-verify-signin.png');
  
  console.log('\n✅ Manual verification complete. Browser will stay open for 10 seconds...');
  await page.waitForTimeout(10000);
  
  await browser.close();
}

manualVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

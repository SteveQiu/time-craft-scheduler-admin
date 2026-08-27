import { requireTestSecret } from './testCredentials.js';
import { test } from '@playwright/test';

const SDEQIU_EMAIL = 'sdeqiu@gmail.com';
const SDEQIU_PASSWORD = requireTestSecret('TESTER3_PASSWORD1');

test('Detailed login form debugging', async ({ page }) => {
  console.log('\n🔐 Detailed Login Form Debug\n');
  
  // Navigate to login
  await page.goto('http://localhost:8083/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // Find the form
  const form = page.locator('form').first();
  console.log(`✅ Found form: ${await form.isVisible()}`);
  
  // Find button before filling
  const button = page.locator('button:has-text("Sign In")').first();
  const buttonVisible = await button.isVisible();
  console.log(`✅ Button visible: ${buttonVisible}`);
  console.log(`✅ Button text: ${await button.textContent()}`);
  
  // Fill inputs
  console.log('\n📝 Filling form...');
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  
  await emailInput.fill(SDEQIU_EMAIL);
  const filledEmail = await emailInput.inputValue();
  console.log(`✅ Email filled: ${filledEmail}`);
  
  await passwordInput.fill(SDEQIU_PASSWORD);
  const filledPassword = await passwordInput.inputValue();
  console.log(`✅ Password filled (length ${filledPassword?.length})`);
  
  // Check form validity
  console.log('\n🔍 Checking form state...');
  const isFormValid = await form.evaluate((el: any) => el.checkValidity?.());
  console.log(`✅ Form valid: ${isFormValid}`);
  
  const isButtonDisabled = await button.isDisabled();
  console.log(`✅ Button disabled: ${isButtonDisabled}`);
  
  // Try different submission methods
  console.log('\n📤 Attempting form submission...');
  
  // Method 1: Direct form submit
  console.log('Method 1: form.evaluate((f) => f.submit())');
  const submitPromise = form.evaluate((el: any) => {
    el.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });
  
  await Promise.race([
    submitPromise,
    new Promise(resolve => setTimeout(resolve, 1000))
  ]);
  
  await page.waitForTimeout(1000);
  
  // Check if any network request was made
  let authRequests = 0;
  page.on('response', response => {
    if (response.url().includes('auth')) {
      authRequests++;
      console.log(`📡 Auth request: ${response.status()}`);
    }
  });
  
  // Method 2: Click button (which should submit the form)
  console.log('\nMethod 2: button.click()');
  await button.click();
  
  await page.waitForTimeout(2000);
  
  console.log(`✅ Auth requests made: ${authRequests}`);
  
  // Check page state after
  const currentUrl = page.url();
  console.log(`✅ URL after submission: ${currentUrl}`);
  
  // Check for toast/error message
  const alerts = await page.locator('[role="alert"], .error, .text-destructive').allTextContents();
  if (alerts.length > 0) {
    console.log(`⚠️  Alerts found:`);
    alerts.forEach(a => console.log(`  - ${a.substring(0, 100)}`));
  }
  
  // Check button state
  const buttonTextAfter = await button.textContent();
  console.log(`✅ Button text after: ${buttonTextAfter}`);
  
  // Try using keyboard submit
  console.log('\nMethod 3: keyboard Enter key');
  await passwordInput.press('Enter');
  
  await page.waitForTimeout(2000);
  
  const finalUrl = page.url();
  console.log(`✅ Final URL: ${finalUrl}`);
  
  console.log(`\n📊 RESULT: ${finalUrl.includes('calendar') ? '✅ LOGGED IN' : '❌ LOGIN FAILED'}`);
});

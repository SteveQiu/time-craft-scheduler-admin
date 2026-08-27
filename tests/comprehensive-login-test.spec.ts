import { requireTestSecret } from './testCredentials.js';
import { test } from '@playwright/test';

const SDEQIU_EMAIL = 'sdeqiu@gmail.com';
const SDEQIU_PASSWORD = requireTestSecret('TESTER3_PASSWORD1');

test('Comprehensive login button fix verification', async ({ page }) => {
  console.log('\n✅ Testing Login Button After Fix\n');
  
  // Navigate to auth
  await page.goto('http://localhost:8083/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // Get the tab content to see if we're in right place
  const tabContent = await page.locator('[role="tabpanel"]').first().textContent();
  console.log(`Tab content preview: ${tabContent?.substring(0, 100)}`);
  
  // Fill credentials
  await page.locator('input[type="email"]').fill(SDEQIU_EMAIL);
  await page.locator('input[type="password"]').fill(SDEQIU_PASSWORD);
  
  // Get ALL buttons and find the one in the active tab
  const allButtons = await page.locator('button').count();
  console.log(`Total buttons on page: ${allButtons}`);
  
  // Look specifically for submit button in the signin form
  const form = page.locator('#signin-form');
  const formVisible = await form.isVisible();
  console.log(`Form #signin-form visible: ${formVisible}`);
  
  const buttonInForm = form.locator('button[type="submit"]');
  const buttonInFormCount = await buttonInForm.count();
  console.log(`Submit buttons in form: ${buttonInFormCount}`);
  
  if (buttonInFormCount > 0) {
    const buttonHTML = await buttonInForm.evaluate((el: any) => ({
      tag: el.tagName,
      type: el.type,
      form: el.form?.id,
      text: el.textContent?.substring(0, 50),
    }));
    
    console.log('Button in form:');
    console.log(JSON.stringify(buttonHTML, null, 2));
  }
  
  // Monitor network
  let authRequestMade = false;
  page.on('response', response => {
    if (response.url().includes('auth') && response.status() >= 200) {
      authRequestMade = true;
      console.log(`✅ Auth request: ${response.status()}`);
    }
  });
  
  // Click the button in the form
  console.log('\n📍 Clicking button...');
  await buttonInForm.click();
  
  // Wait
  await page.waitForTimeout(2000);
  
  console.log(`\n📊 Network request made: ${authRequestMade}`);
  
  // Check URL
  const url = page.url();
  const loggedIn = url.includes('dashboard') || url.includes('calendar');
  console.log(`URL: ${url}`);
  console.log(`\n🎯 RESULT: ${loggedIn ? '✅ SUCCESS' : '❌ FAILED'}`);
});

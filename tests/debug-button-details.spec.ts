import { test } from '@playwright/test';

test('Investigate button click issue details', async ({ page }) => {
  console.log('\n🔍 Investigating button click submission\n');
  
  await page.goto('http://localhost:8083/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // Get button element details
  const button = page.locator('button:has-text("Sign In")').first();
  
  const buttonDetails = await button.evaluate((el: any) => ({
    type: el.type,
    form: el.form?.id,
    disabled: el.disabled,
    className: el.className,
    tagName: el.tagName,
    parentForm: el.closest('form') ? 'yes' : 'no',
    onclick: el.onclick ? 'yes' : 'no',
    formAction: el.formAction,
    formMethod: el.formMethod,
  }));
  
  console.log('Button details:');
  console.log(JSON.stringify(buttonDetails, null, 2));
  
  // Get form details
  const form = page.locator('form').first();
  const formDetails = await form.evaluate((el: any) => ({
    id: el.id,
    method: el.method,
    action: el.action,
    onsubmit: el.onsubmit ? 'yes' : 'no',
    childButtonCount: el.querySelectorAll('button').length,
    childButtonTypes: Array.from(el.querySelectorAll('button')).map((b: any) => b.type),
  }));
  
  console.log('\nForm details:');
  console.log(JSON.stringify(formDetails, null, 2));
  
  // Check if clicking button triggers submit event on form
  let submitEventFired = false;
  
  const submitPromise = form.evaluate((el: any) => {
    return new Promise((resolve) => {
      el.addEventListener('submit', (e: any) => {
        console.log('FORM SUBMIT EVENT FIRED');
        resolve('submit-event');
      });
      
      // Click button
      const btn = el.querySelector('button[type="submit"]');
      if (btn) {
        btn.click();
      }
    });
  });
  
  try {
    const result = await Promise.race([
      submitPromise,
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
    ]);
    console.log(`\n✅ Result from form evaluation: ${result}`);
    submitEventFired = true;
  } catch (e) {
    console.log(`\n❌ Submit event not fired within timeout`);
  }
  
  // Now try actual browser button click via Playwright
  console.log('\n📍 Trying Playwright button.click()...');
  
  await page.goto('http://localhost:8083/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  let networkRequestMade = false;
  page.once('response', response => {
    if (response.url().includes('auth')) {
      networkRequestMade = true;
      console.log(`📡 Network request made: ${response.status()}`);
    }
  });
  
  // Fill form
  await page.locator('input[type="email"]').fill('test@test.com');
  await page.locator('input[type="password"]').fill('password');
  
  // Click button
  await page.locator('button:has-text("Sign In")').first().click();
  
  // Wait for potential network request
  await page.waitForTimeout(2000);
  
  console.log(`\n✅ Network request made: ${networkRequestMade}`);
  
  // Try keyboard approach for comparison
  console.log('\n📍 Trying keyboard Enter submission...');
  
  await page.goto('http://localhost:8083/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  networkRequestMade = false;
  page.once('response', response => {
    if (response.url().includes('auth')) {
      networkRequestMade = true;
      console.log(`📡 Network request made: ${response.status()}`);
    }
  });
  
  // Fill form
  await page.locator('input[type="email"]').fill('test@test.com');
  await page.locator('input[type="password"]').fill('password');
  
  // Press Enter
  await page.locator('input[type="password"]').press('Enter');
  
  // Wait for potential network request
  await page.waitForTimeout(2000);
  
  console.log(`\n✅ Network request made with Enter: ${networkRequestMade}`);
});

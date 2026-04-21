import { test } from '@playwright/test';

test('Check button form attribute', async ({ page }) => {
  await page.goto('http://localhost:8083/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  const button = page.locator('button:has-text("Sign In")').first();
  
  const buttonAttrs = await button.evaluate((el: any) => ({
    type: el.type,
    form: el.form?.id,
    formAttribute: el.getAttribute('form'),
    onclick: el.onclick,
  }));
  
  console.log('Button attributes:');
  console.log(JSON.stringify(buttonAttrs, null, 2));
  
  // Check if form exists
  const hasForm = await page.locator('#signin-form').count();
  console.log(`\nForm #signin-form exists: ${hasForm > 0}`);
  
  // Try calling requestSubmit directly
  console.log('\nTrying direct requestSubmit...');
  const submitResult = await page.evaluate(() => {
    const form = document.getElementById('signin-form');
    if (form) {
      console.log('Form found, calling requestSubmit()');
      form.requestSubmit();
      return 'submitted';
    }
    return 'form-not-found';
  });
  
  console.log(`Result: ${submitResult}`);
  
  await page.waitForTimeout(2000);
});

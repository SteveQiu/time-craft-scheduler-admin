import { test } from '@playwright/test';

test('Debug Button component rendering', async ({ page }) => {
  await page.goto('http://localhost:8083/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  // Get the raw HTML of the button
  const buttonHTML = await page.locator('button:has-text("Sign In")').first().evaluate(el => el.outerHTML);
  
  console.log('Button HTML:');
  console.log(buttonHTML.substring(0, 500));
  
  // Check all attributes
  const allAttrs = await page.locator('button:has-text("Sign In")').first().evaluate((el: any) => {
    return Object.keys(el.attributes).reduce((acc: any, i: any) => {
      const attr = el.attributes[i];
      acc[attr.name] = attr.value;
      return acc;
    }, {});
  });
  
  console.log('\nAll button attributes:');
  console.log(JSON.stringify(allAttrs, null, 2));
});

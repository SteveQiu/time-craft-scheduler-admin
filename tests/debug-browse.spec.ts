import { test, chromium } from '@playwright/test';

test('browse list and detail views work', async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n=== BROWSE LIST VIEW ===\n');

  // Load browse page
  await page.goto('http://localhost:8080/browse');
  await page.waitForTimeout(2000);
  
  const browseHTML = await page.locator('body').innerHTML();
  console.log(`✅ Browse list loaded: ${browseHTML.length} chars`);

  // Click provider
  console.log('\n=== BROWSE DETAIL VIEW ===\n');
  const clickableElements = await page.locator('div[class*="cursor-pointer"]').all();
  if (clickableElements.length > 0) {
    await clickableElements[0].click();
    await page.waitForTimeout(2000);

    const detailHTML = await page.locator('body').innerHTML();
    const detailURL = page.url();
    console.log(`✅ Detail view loaded: ${detailHTML.length} chars`);
    console.log(`   URL: ${detailURL}`);

    // Verify key elements
    const hasServices = await page.locator('text=Services').count() > 0;
    console.log(`   Has Services: ${hasServices ? '✓' : '✗'}`);
    
    const hasWorkers = await page.locator('text=Workers').count() > 0;
    console.log(`   Has Workers: ${hasWorkers ? '✓' : '✗'}`);

    const hasCalendar = await page.locator('button').filter({ hasText: /←|→/ }).count() > 0;
    console.log(`   Has Calendar nav: ${hasCalendar ? '✓' : '✗'}`);
  }

  await page.screenshot({ path: 'test-debug-screenshot.png', fullPage: true });
  console.log('\n✅ Screenshot saved\n');

  await context.close();
  await browser.close();
});

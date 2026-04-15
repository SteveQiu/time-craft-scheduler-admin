import { test, expect } from '@playwright/test';
import fs from 'fs';

test('Simple booking flow', async ({ page }) => {
  const debugDir = 'debug/simple-booking';
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  console.log('\n=== SIMPLE BOOKING TEST ===\n');

  // 1. Sign in
  console.log('1. Signing in...');
  await page.goto('http://localhost:8080/auth');
  await page.fill('input[type="email"]', 'aaa@aaa.com');
  await page.fill('input[type="password"]', 'aaaaaa');
  await page.press('input[type="password"]', 'Enter');
  await page.waitForNavigation({ timeout: 10000 });
  console.log('   ✅ Signed in');

  // 2. Go to provider detail page directly
  console.log('2. Going directly to provider detail page...');
  await page.goto('http://localhost:8080/browse/f0927dd8-9e7d-4830-a6b5-c96a3c627fe9');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Screenshot after nav
  await page.screenshot({ path: `${debugDir}/provider-detail.png` });
  
  // Get page content
  const pageText = await page.locator('body').textContent();
  console.log('   Page contains:');
  console.log(`   - "Test Org": ${pageText?.includes('Test Org')}`);
  console.log(`   - "Hair cut": ${pageText?.includes('Hair cut')}`);
  console.log(`   - "Strategy": ${pageText?.includes('Strategy')}`);
  console.log(`   - "Rio": ${pageText?.includes('Rio')}`);
  console.log(`   - "Steve": ${pageText?.includes('Steve')}`);
  console.log(`   - "April": ${pageText?.includes('April')}`);

  // 3. Click on Strategy service
  console.log('3. Clicking Strategy service...');
  const strategyCards = await page.$$eval('[class*="cursor-pointer"]', els =>
    els.map((el, i) => ({ index: i, text: el.textContent?.trim() }))
  );
  console.log('   Clickable elements:');
  strategyCards.forEach(c => console.log(`     [${c.index}]: "${c.text}"`));
  
  // Find Strategy card
  const strategyIndex = strategyCards.findIndex(c => c.text?.includes('Strategy'));
  if (strategyIndex >= 0) {
    console.log(`   ✅ Found Strategy at index ${strategyIndex}`);
    const clickableCards = await page.$$('[class*="cursor-pointer"]');
    await clickableCards[strategyIndex].click();
    await page.waitForTimeout(1000);
    console.log('   ✅ Clicked Strategy');
  } else {
    console.log('   ❌ Strategy not found!');
  }
  
  await page.screenshot({ path: `${debugDir}/after-strategy-click.png` });

  // 4. Check what workers are now visible
  console.log('4. Checking visible workers after Strategy click...');
  const pageText2 = await page.locator('body').textContent();
  console.log(`   Page now contains Rio: ${pageText2?.includes('Rio')}`);
  console.log(`   Page now contains Steve: ${pageText2?.includes('Steve')}`);
  console.log(`   Page has "April": ${pageText2?.includes('April')}`);
  
  // Look for worker elements
  const workers = await page.$$eval('[class*="cursor-pointer"]', els =>
    els.map((el, i) => ({ index: i, text: el.textContent?.trim() }))
  );
  console.log('   Clickable elements after service click:');
  workers.forEach(w => console.log(`     [${w.index}]: "${w.text}"`));

  // 5. Click on a worker (look for Rio or any non-service worker)
  const serviceNames = ['Hair cut', 'Strategy', 'Tutor', 'Detection', 'Offence'];
  const workerIndex = workers.findIndex(w => !serviceNames.some(s => w.text?.includes(s)));
  
  if (workerIndex >= 0) {
    console.log(`5. Found worker at index ${workerIndex}: "${workers[workerIndex].text}"`);
    const clickableElements = await page.$$('[class*="cursor-pointer"]');
    await clickableElements[workerIndex].click();
    await page.waitForTimeout(1000);
    console.log('   ✅ Clicked worker');
  } else {
    console.log('5. ❌ No worker found (all elements are services)');
  }
  
  await page.screenshot({ path: `${debugDir}/after-worker-click.png` });

  // 6. Check for calendar and times
  console.log('6. Checking for calendar and times...');
  const pageText3 = await page.locator('body').textContent();
  console.log(`   Has "April": ${pageText3?.includes('April')}`);
  console.log(`   Has "Book": ${pageText3?.includes('Book')}`);
  
  // Look for highlighted date buttons (dates with openings)
  const dateButtons = await page.locator('button').all();
  console.log(`   Found ${dateButtons.length} total buttons`);
  
  let clickedDate = false;
  for (const btn of dateButtons) {
    const text = await btn.textContent();
    const isNum = /^\d+$/.test(text?.trim() || '');
    const isHighlighted = await btn.evaluate(el => {
      const style = window.getComputedStyle(el);
      return el.className.includes('bg-primary') || el.className.includes('primary');
    });
    
    if (isNum && isHighlighted) {
      console.log(`7. Found highlighted date: ${text}, clicking...`);
      await btn.click();
      clickedDate = true;
      await page.waitForTimeout(1000);
      break;
    }
  }
  
  if (!clickedDate) {
    // Try clicking date 16 directly
    console.log('7. Trying to click date 16 directly...');
    try {
      await page.click('button:has-text("16")');
      await page.waitForTimeout(1000);
      clickedDate = true;
      console.log('   ✅ Clicked date 16');
    } catch (e) {
      console.log('   ❌ Could not click date 16');
    }
  }
  
  await page.screenshot({ path: `${debugDir}/after-date-click.png` });
  
  // 8. Check for book buttons now
  const pageText4 = await page.locator('body').textContent();
  console.log('8. After date click:');
  console.log(`   Has "Available Times": ${pageText4?.includes('Available Times')}`);
  
  // Try to find and click a book button
  const bookButtons = await page.$$('button:has-text("Book")');
  console.log(`   Found ${bookButtons.length} Book buttons`);
  
  if (bookButtons.length > 0) {
    console.log('9. ✅ Clicking book button...');
    await bookButtons[0].click();
    await page.waitForTimeout(1000);
    console.log('   ✅ Clicked book button');
    
    // Check for confirmation
    await page.screenshot({ path: `${debugDir}/after-book-click.png` });
    const confirmText = await page.locator('body').textContent();
    console.log(`   Has "Confirm": ${confirmText?.includes('Confirm')}`);
    
    // 10. Click confirm button
    console.log('10. Clicking Confirm button...');
    const confirmButtons = await page.$$('button:has-text("Confirm")');
    if (confirmButtons.length > 0) {
      await confirmButtons[0].click();
      await page.waitForTimeout(2000);
      console.log('    ✅ Clicked Confirm');
      
      // Check for success or error
      await page.screenshot({ path: `${debugDir}/after-confirm.png` });
      const resultText = await page.locator('body').textContent();
      console.log(`    Has "booked": ${resultText?.includes('booked')}`);
      console.log(`    Has "success": ${resultText?.includes('success')}`);
      console.log(`    Has "failed": ${resultText?.includes('failed')}`);
      console.log(`    Has "error": ${resultText?.includes('error')}`);
      console.log(`    Has "Appointment": ${resultText?.includes('Appointment')}`);
      
      // Wait and check final state
      await page.waitForTimeout(2000);
      const url = page.url();
      console.log(`    URL: ${url}`);
      
      const finalText = await page.locator('body').textContent();
      console.log(`    Page still has "Test Org": ${finalText?.includes('Test Org')}`);
      console.log(`    Page still has "Services": ${finalText?.includes('Services')}`);
      
      console.log('\n    ✅ BOOKING FLOW COMPLETE');
    } else {
      console.log('    ❌ No Confirm button found');
    }
  } else {
    console.log('9. ❌ No book buttons found');
  }

  console.log('\n=== TEST COMPLETE ===\n');
});

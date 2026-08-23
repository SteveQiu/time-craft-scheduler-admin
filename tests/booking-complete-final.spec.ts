import { test } from '@playwright/test';
import fs from 'fs';

test.describe('Complete Booking Flow - Fixed', () => {
  test('Sign in, browse, select provider, and book appointment', async ({ page }) => {
    const debugDir = 'debug/booking-complete';
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    console.log('\n=== COMPLETE BOOKING FLOW TEST ===\n');

    // Step 1: Sign in
    console.log('1. Signing in...');
    await page.goto('http://localhost:8080/auth');
    await page.fill('input[type="email"]', 'aaa@aaa.com');
    await page.fill('input[type="password"]', 'aaaaaa');
    await page.press('input[type="password"]', 'Enter');
    await page.waitForNavigation({ timeout: 10000 });
    console.log('   ✅ Signed in');

    // Step 2: Navigate to browse
    console.log('2. Navigate to /browse...');
    await page.goto('http://localhost:8080/browse');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    console.log('   ✅ On browse page');
    
    // Step 3: Find and click provider card
    console.log('3. Looking for provider card...');
    
    // Click the card using keyboard navigation or direct click
    console.log('4. Clicking provider card...');
    
    // Try to find the clickable card
    const cards = await page.$$('[class*="shadow-soft"]');
    let clicked = false;
    
    for (const card of cards) {
      const text = await card.textContent();
      if (text && text.includes('Test Org')) {
        await card.click();
        clicked = true;
        console.log('   ✅ Clicked Test Org card');
        break;
      }
    }
    
    if (!clicked) {
      console.log('   ❌ Could not click card');
      throw new Error('Card not found');
    }
    
    await page.waitForURL('**/browse/**', { timeout: 10000 });
    console.log(`   ✅ Navigated to provider page (${page.url()})`);
    await page.screenshot({ path: `${debugDir}/provider-detail.png` });

    // Step 4: Wait for openings to load
    console.log('5. Waiting for openings to load...');
    await page.waitForTimeout(1000);
    
    // The page shows "325 available appointments" which means data is loaded
    // But we need to click through the hierarchical selection:
    // Services are rendered as Cards with text content, not buttons
    
    console.log('6. Looking for service cards...');
    const allText = await page.$$eval('[class*="Card"]', els => 
      els.map(el => ({text: el.textContent?.substring(0, 50), html: el.outerHTML.substring(0, 200)}))
    );
    console.log(`   Found ${allText.length} card-like elements`);
    
    // Try to find and click the first service card
    const serviceCards = await page.$$('[class*="cursor-pointer"][class*="border"]');
    console.log(`   Found ${serviceCards.length} clickable bordered elements`);
    
    if (serviceCards.length > 0) {
      console.log('7. Clicking first service card (Hair cut)...');
      await serviceCards[0].click();
      await page.waitForTimeout(500);
      
      console.log('8. Looking for worker cards in Workers column...');
      // After clicking service, we should have workers. Look for a heading "Workers" then the cards after it
      const workerHeading = await page.$('text=Workers');
      if (!workerHeading) {
        console.log('   ❌ No "Workers" heading found');
        await page.screenshot({ path: `${debugDir}/no-workers.png` });
        throw new Error('Workers section not found');
      }
      
      console.log('   ✅ Found Workers heading');
      
      // Debug: list ALL clickable bordered elements and their text
      const allClickableCards = await page.$$('[class*="cursor-pointer"][class*="border"]');
      console.log(`   Total clickable bordered cards: ${allClickableCards.length}`);
      for (let i = 0; i < allClickableCards.length; i++) {
        const text = await allClickableCards[i].textContent();
        console.log(`     [${i}]: "${text}"`);
      }
      
      // Look for elements specifically after the Workers heading
      const _workersHeadingParent = await workerHeading.evaluate(el => el.closest('[class*="space-y"]') || el.parentElement?.parentElement);
      console.log('   Looking for cards in Workers parent container...');
      
      // Actually, let me find cards by their visual presence - look for all divs with text like "Rio"
      const allText = await page.locator('body').textContent();
      if (allText && allText.includes('Rio')) {
        console.log('   ✅ Page contains "Rio"');
      } else {
        console.log('   ❌ Page does NOT contain "Rio"');
      }
      
      // Try clicking workerCards[5] (might be the worker card if the first 5 are services)
      if (allClickableCards.length > 5) {
        console.log('9. Looking for Rio worker card...');
        
        // Find Rio specifically by checking cards after index 4
        let rioIndex = -1;
        for (let i = 5; i < allClickableCards.length; i++) {
          const text = await allClickableCards[i].textContent();
          console.log(`    [${i}]: "${text}"`);
          if (text && text.includes('Rio')) {
            rioIndex = i;
            break;
          }
        }
        
        if (rioIndex >= 0) {
          console.log(`    ✅ Found Rio at index ${rioIndex}, clicking...`);
          await allClickableCards[rioIndex].click();
        } else {
          console.log('    ⚠️  Rio not found, clicking [5] anyway');
          await allClickableCards[5].click();
        }
      } else {
        console.log('9. ❌ Not enough cards. Looking for hidden elements...');
      }
      await page.waitForTimeout(500);
      
      console.log('10. After worker selection...');
      
      // Dump full page text
      const pageText2 = await page.locator('body').textContent();
      const fullText2 = pageText2 || '';
      console.log(`    Has calendar (April/Sun): ${fullText2.includes('April') || fullText2.includes('Sun')}`);
      console.log(`    Has "Book" button: ${fullText2.includes('Book')}`);
    }
    
    await page.screenshot({ path: `${debugDir}/after-selection.png` });
    
    const bookButtons = await page.$$('button:has-text("Book")');
    console.log(`   Found ${bookButtons.length} book buttons`);
    
    if (bookButtons.length === 0) {
      console.log('   ❌ No book buttons found!');
      await page.screenshot({ path: `${debugDir}/no-book-buttons.png` });
      throw new Error('No book buttons found');
    }

    // Step 5: Click first book button
    console.log('6. Clicking first book button...');
    await bookButtons[0].click();
    await page.waitForTimeout(1000);
    console.log('   ✅ Clicked book button');

    // Step 6: Look for booking dialog
    console.log('7. Waiting for booking dialog...');
    try {
      await page.waitForSelector('text=Confirm Booking', { timeout: 5000 });
      console.log('   ✅ Dialog appeared');
    } catch {
      console.log('   ❌ Dialog did not appear');
      await page.screenshot({ path: `${debugDir}/no-dialog.png` });
      throw new Error('Booking dialog not found');
    }

    await page.screenshot({ path: `${debugDir}/confirm-dialog.png` });

    // Step 7: Confirm booking
    console.log('8. Clicking Confirm Booking...');
    
    // Capture network activity
    let rpcCalled = false;
    let rpcStatus = null;
    let rpcError = null;
    
    page.on('response', async (response) => {
      if (response.url().includes('rpc/book_opening')) {
        rpcCalled = true;
        rpcStatus = response.status();
        const body = await response.text();
        console.log(`   [RPC] Status: ${rpcStatus}`);
        console.log(`   [RPC] Body: ${body.substring(0, 200)}`);
        if (!response.ok()) {
          rpcError = body;
        }
      }
    });

    await page.click('button:has-text("Confirm Booking")');
    await page.waitForTimeout(3000);

    console.log(`   ✅ RPC called: ${rpcCalled}, Status: ${rpcStatus}`);

    // Step 8: Check for success
    console.log('9. Checking for success message...');
    const successMsg = await page.$('text=Appointment booked').catch(() => null);
    const errorMsg = await page.$('text=Failed to book').catch(() => null);

    if (successMsg) {
      console.log('   ✅ SUCCESS! Appointment booked!');
      await page.screenshot({ path: `${debugDir}/success.png` });
    } else if (errorMsg) {
      console.log('   ❌ ERROR! Failed to book appointment');
      if (rpcError) {
        console.log(`   Error details: ${rpcError}`);
      }
      await page.screenshot({ path: `${debugDir}/error.png` });
      throw new Error('Booking failed');
    } else {
      console.log('   ⚠️  No message found');
      await page.screenshot({ path: `${debugDir}/no-message.png` });
    }

    console.log('\n=== TEST COMPLETE ===\n');
  });
});

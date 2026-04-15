import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Booking Flow - Complete Debug', () => {
  test('Book an opening and capture all errors', async ({ page }) => {
    const debugDir = 'debug/booking-e2e';
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    const logs = {
      steps: [],
      rpcCalls: [],
      networkErrors: [],
      consoleErrors: [],
      finalResult: null
    };

    // Capture console messages
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Booking') || msg.text().includes('Error')) {
        logs.consoleErrors.push({
          type: msg.type(),
          text: msg.text(),
          time: new Date().toISOString()
        });
        console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
      }
    });

    // Capture network errors
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('rpc/book_opening')) {
        const status = response.status();
        const body = await response.text();
        logs.rpcCalls.push({
          url,
          status,
          method: response.request().method(),
          body: body.substring(0, 1000),
          time: new Date().toISOString()
        });
        console.log(`[RPC] ${status} ${url}`);
        console.log(`[RPC BODY] ${body.substring(0, 500)}`);
      }
    });

    // Helper to log steps
    const log = (step, data = null) => {
      console.log(`\n✓ ${step}`);
      logs.steps.push({ step, data, time: new Date().toISOString() });
    };

    try {
      // Step 1: Navigate to home
      log('Navigate to localhost:8080');
      await page.goto('http://localhost:8080');
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

      // Step 2: Check if need to sign in
      log('Check authentication status');
      const hasSignOut = await page.locator('button:has-text("Sign Out")').isVisible().catch(() => false);
      const hasSignIn = await page.locator('button:has-text("Sign In")').isVisible().catch(() => false);
      
      if (hasSignIn && !hasSignOut) {
        log('Not authenticated, signing in', { email: 'aaa@aaa.com' });
        
        await page.click('button:has-text("Sign In")');
        await page.waitForSelector('input[type="email"]', { timeout: 5000 });
        
        await page.fill('input[type="email"]', 'aaa@aaa.com');
        await page.fill('input[type="password"]', 'aaaaaa');
        await page.click('button:has-text("Sign In")');
        
        // Wait for redirect to dashboard
        await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
          log('Sign in may have failed or redirected elsewhere');
          console.log('Current URL:', page.url());
        });
        
        log('Signed in successfully');
      } else {
        log('Already authenticated');
      }

      // Step 3: Navigate to browse
      log('Navigate to /browse');
      await page.goto('http://localhost:8080/browse');
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // Step 4: Look for providers
      log('Looking for providers to browse');
      const providerLinks = await page.$$('a[href*="/browse/"]');
      log(`Found ${providerLinks.length} providers`);

      if (providerLinks.length === 0) {
        log('No providers found, taking screenshot');
        await page.screenshot({ path: `${debugDir}/no-providers.png` });
        logs.finalResult = 'FAILED: No providers found';
        return;
      }

      // Step 5: Click first provider
      const firstProviderUrl = await providerLinks[0].getAttribute('href');
      log(`Clicking first provider: ${firstProviderUrl}`);
      await providerLinks[0].click();
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // Step 6: Look for book buttons
      log('Looking for book buttons');
      const bookButtons = await page.$$('button:has-text("Book")');
      log(`Found ${bookButtons.length} book buttons`);

      if (bookButtons.length === 0) {
        log('No book buttons found, taking screenshot');
        await page.screenshot({ path: `${debugDir}/no-book-buttons.png` });
        logs.finalResult = 'FAILED: No available slots to book';
        return;
      }

      // Step 7: Click first book button
      log('Clicking first book button');
      await bookButtons[0].click();
      await page.waitForTimeout(1000);

      // Step 8: Wait for booking dialog
      log('Waiting for booking dialog');
      try {
        await page.waitForSelector('text=Confirm Booking', { timeout: 5000 });
        log('Booking dialog appeared');
      } catch {
        log('Booking dialog did not appear');
        await page.screenshot({ path: `${debugDir}/no-dialog.png` });
        logs.finalResult = 'FAILED: Booking dialog did not appear';
        return;
      }

      // Step 9: Take screenshot of dialog
      await page.screenshot({ path: `${debugDir}/booking-dialog.png` });

      // Step 10: Click confirm booking
      log('Clicking confirm booking button');
      await page.click('button:has-text("Confirm Booking")');
      
      // Wait for RPC call to complete
      await page.waitForTimeout(3000);

      // Step 11: Check for success or error message
      log('Checking for success or error message');
      const successToast = await page.$('text=Appointment booked successfully').catch(() => null);
      const errorToast = await page.$('text=Failed to book').catch(() => null);

      if (successToast) {
        log('✅ SUCCESS! Appointment booked successfully');
        await page.screenshot({ path: `${debugDir}/success.png` });
        logs.finalResult = 'SUCCESS: Booking completed';
      } else if (errorToast) {
        log('❌ ERROR! Failed to book appointment');
        await page.screenshot({ path: `${debugDir}/error.png` });
        
        // Try to capture error text
        const errorText = await page.textContent('text=Failed to book');
        log('Error message:', { text: errorText });
        logs.finalResult = `FAILED: ${errorText}`;
      } else {
        log('No success or error message found');
        await page.screenshot({ path: `${debugDir}/no-message.png` });
        logs.finalResult = 'UNCLEAR: No feedback message';
      }

      // Step 12: Check console for any errors
      log('Check console for errors');
      const pageErrors = await page.evaluate(() => {
        return (window as any).__errors || [];
      }).catch(() => []);
      
      if (pageErrors.length > 0) {
        log('Found page errors:', pageErrors);
      }

    } catch (error) {
      log('Test error:', { message: error.message });
      logs.finalResult = `ERROR: ${error.message}`;
    }

    // Save logs
    fs.writeFileSync(`${debugDir}/logs.json`, JSON.stringify(logs, null, 2));
    console.log('\n=== FINAL RESULT ===');
    console.log(logs.finalResult);
    console.log('\n=== RPC CALLS ===');
    logs.rpcCalls.forEach(rpc => {
      console.log(`${rpc.status} ${rpc.url}`);
      console.log(`Body: ${rpc.body}`);
    });
    console.log('\n=== CONSOLE ERRORS ===');
    logs.consoleErrors.forEach(err => {
      console.log(`[${err.type}] ${err.text}`);
    });

    // Write summary
    fs.writeFileSync(`${debugDir}/summary.txt`, 
      `Booking Flow Test Summary
===========================

Final Result: ${logs.finalResult}

Steps Completed: ${logs.steps.length}
RPC Calls Made: ${logs.rpcCalls.length}
Console Errors: ${logs.consoleErrors.length}

RPC Call Details:
${logs.rpcCalls.map(r => `- ${r.status} ${r.url.substring(50)}`).join('\n')}

Console Errors:
${logs.consoleErrors.map(e => `- [${e.type}] ${e.text}`).join('\n')}
`);

  });
});

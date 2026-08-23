import { test } from '@playwright/test';
import fs from 'fs';

test.describe('Booking Debug - Capture Everything', () => {
  test('should capture all network and console data during booking', async ({ page, _context }, testInfo) => {
    // Set larger viewport
    page.setViewportSize({ width: 1400, height: 900 });
    
    // Create debug output directory
    const debugDir = 'debug/booking-debug-data';
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    // Capture all network requests
    const networkRequests: any[] = [];
    const consoleMessages: any[] = [];
    const pageErrors: any[] = [];
    
    // Listen to all network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Listen to network responses
    page.on('response', response => {
      if (response.url().includes('rpc')) {
        response.text().then(body => {
          networkRequests.push({
            url: response.url(),
            status: response.status(),
            responseBody: body.substring(0, 1000),
            responseType: response.headers()['content-type'],
            timestamp: new Date().toISOString()
          });
        }).catch(() => {});
      }
    });
    
    // Listen to console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        args: msg.args().length,
        timestamp: new Date().toISOString()
      });
      console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    });
    
    // Listen to page errors
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.log('[PAGE ERROR]', error.message);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('BOOKING DEBUG - CAPTURING ALL EVENTS');
    console.log('='.repeat(80));
    
    // Navigate to opening
    console.log('\n1. Navigating to opening page...');
    await page.goto('http://localhost:8084/openings/f0927dd8-9e7d-4830-a6b5-c96a3c627fe9', {
      waitUntil: 'networkidle'
    });
    
    await page.screenshot({ path: `${debugDir}/01-initial-load.png` });
    
    // Check if sign in button exists
    console.log('2. Looking for Sign In or Book button...');
    const signInBtn = page.locator('button:has-text("Sign In")').first();
    const bookBtn = page.locator('button:has-text("Book")').first();
    
    const hasSignIn = await signInBtn.isVisible().catch(() => false);
    const hasBook = await bookBtn.isVisible().catch(() => false);
    
    console.log(`   Sign In visible: ${hasSignIn}`);
    console.log(`   Book visible: ${hasBook}`);
    
    if (hasSignIn) {
      console.log('3. Clicking Sign In...');
      await signInBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${debugDir}/02-signin-dialog.png` });
      
      // Look for email/password fields
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      console.log(`   Email field found: ${await emailInput.isVisible().catch(() => false)}`);
      console.log(`   Password field found: ${await passwordInput.isVisible().catch(() => false)}`);
    } else if (hasBook) {
      console.log('3. User already logged in, Book button visible');
      console.log('4. Clicking Book...');
      await bookBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${debugDir}/03-book-dialog.png` });
      
      // Look for confirm button
      const confirmBtn = page.locator('[role="alertdialog"] button').last();
      console.log('5. Clicking Confirm...');
      await confirmBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${debugDir}/04-result.png` });
    }
    
    // Wait for all network requests to settle
    await page.waitForTimeout(2000);
    
    // Save all captured data
    console.log('\n' + '='.repeat(80));
    console.log('CAPTURED DATA');
    console.log('='.repeat(80));
    
    // Save network requests
    fs.writeFileSync(
      `${debugDir}/network-requests.json`,
      JSON.stringify(networkRequests, null, 2)
    );
    console.log(`\n✅ Network requests: ${networkRequests.length} captured`);
    console.log(`   Saved to: ${debugDir}/network-requests.json`);
    
    // Save console messages
    fs.writeFileSync(
      `${debugDir}/console-messages.json`,
      JSON.stringify(consoleMessages, null, 2)
    );
    console.log(`\n✅ Console messages: ${consoleMessages.length} captured`);
    console.log(`   Saved to: ${debugDir}/console-messages.json`);
    
    // Save page errors
    if (pageErrors.length > 0) {
      fs.writeFileSync(
        `${debugDir}/page-errors.json`,
        JSON.stringify(pageErrors, null, 2)
      );
      console.log(`\n❌ Page errors: ${pageErrors.length} captured`);
      console.log(`   Saved to: ${debugDir}/page-errors.json`);
    }
    
    // Print error details
    if (pageErrors.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('PAGE ERRORS:');
      console.log('='.repeat(80));
      pageErrors.forEach(err => {
        console.log(`\nError: ${err.message}`);
        console.log('Stack:', err.stack?.substring(0, 500));
      });
    }
    
    // Print RPC calls
    const rpcCalls = networkRequests.filter(r => r.url?.includes('rpc') || r.url?.includes('functions'));
    if (rpcCalls.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('RPC CALLS:');
      console.log('='.repeat(80));
      rpcCalls.forEach((call, idx) => {
        console.log(`\n${idx + 1}. ${call.url}`);
        console.log(`   Method: ${call.method}`);
        console.log(`   Status: ${call.status}`);
        if (call.postData) {
          console.log(`   Request: ${call.postData.substring(0, 200)}`);
        }
        if (call.responseBody) {
          console.log(`   Response: ${call.responseBody}`);
        }
      });
    }
    
    // Print booking-related console messages
    const bookingLogs = consoleMessages.filter(m => 
      m.text?.toLowerCase().includes('book') || 
      m.text?.toLowerCase().includes('error') ||
      m.text?.toLowerCase().includes('failed')
    );
    
    if (bookingLogs.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('BOOKING-RELATED LOGS:');
      console.log('='.repeat(80));
      bookingLogs.forEach((msg, idx) => {
        console.log(`${idx + 1}. [${msg.type}] ${msg.text}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`Full debug data saved to: ${debugDir}/`);
    console.log('='.repeat(80) + '\n');
    
    expect(true).toBeTruthy();
  });
});

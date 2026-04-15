import { test, expect } from '@playwright/test';
import fs from 'fs';

test('Complete Booking Flow Debug - openings route', async ({ page }) => {
  const debugDir = 'debug/booking-flow-complete';
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  const logs: any = {
    steps: [],
    requests: [],
    responses: [],
    errors: [],
    final_status: null
  };

  function log(step: string, data?: any) {
    const msg = `[${new Date().toLocaleTimeString()}] ${step}`;
    console.log(msg);
    logs.steps.push({ time: new Date().toISOString(), step, data });
  }

  // Capture requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('supabase') || url.includes('rpc') || url.includes('/rest/')) {
      logs.requests.push({
        url,
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Capture responses with full details
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('supabase') || url.includes('rpc') || url.includes('/rest/')) {
      try {
        const body = await response.text();
        logs.responses.push({
          url,
          status: response.status(),
          method: response.request().method(),
          timestamp: new Date().toISOString(),
          body: body.substring(0, 500)
        });
      } catch (e) {
        logs.responses.push({
          url,
          status: response.status(),
          method: response.request().method(),
          timestamp: new Date().toISOString(),
          error: 'Could not read body'
        });
      }
    }
  });

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.errors.push({
        type: 'console',
        message: msg.text(),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    logs.errors.push({
      type: 'page',
      message: error.message,
      stack: error.stack?.substring(0, 200),
      timestamp: new Date().toISOString()
    });
  });

  try {
    log('Starting test');
    
    // Step 1: Load home page
    log('Navigate to home page');
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: `${debugDir}/01-home.png` });
    
    log('Check authentication status');
    const hasSignOut = await page.locator('button:has-text("Sign Out")').isVisible().catch(() => false);
    const hasSignIn = await page.locator('button:has-text("Sign In")').isVisible().catch(() => false);
    log('Auth status', { hasSignOut, hasSignIn, isAuthenticated: hasSignOut && !hasSignIn });

    if (hasSignIn && !hasSignOut) {
      log('User not authenticated - would need to sign in');
      log('For automated testing, we need persistent auth');
      logs.final_status = 'NOT_AUTHENTICATED';
      
      // Just navigate to the opening to see what renders
      log('Navigating to opening page anyway to see structure');
      await page.goto('http://localhost:8080/openings/f0927dd8-9e7d-4830-a6b5-c96a3c627fe9');
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await page.screenshot({ path: `${debugDir}/02-opening-not-auth.png` });
    } else if (hasSignOut) {
      log('User is authenticated! Proceeding with booking test');
      
      // Step 2: Navigate to opening
      log('Navigate to opening page');
      await page.goto('http://localhost:8080/openings/f0927dd8-9e7d-4830-a6b5-c96a3c627fe9');
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await page.screenshot({ path: `${debugDir}/03-opening-loaded.png` });

      // Step 3: Check page content
      log('Verify opening details loaded');
      const openingTitle = await page.locator('h1, h2, h3').first().textContent();
      log('Opening title', { title: openingTitle });

      // Step 4: Find Book button
      log('Looking for Book button');
      const bookBtn = page.locator('button:has-text("Book")').first();
      const bookVisible = await bookBtn.isVisible().catch(() => false);
      log('Book button', { visible: bookVisible });

      if (bookVisible) {
        log('Clicking Book button');
        await bookBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${debugDir}/04-after-book-click.png` });

        // Step 5: Find Confirm button
        log('Looking for Confirm button');
        const confirmBtn = page.locator('button:has-text("Confirm")').first();
        const confirmVisible = await confirmBtn.isVisible().catch(() => false);
        log('Confirm button', { visible: confirmVisible });

        if (confirmVisible) {
          log('Clicking Confirm button');
          
          // Clear previous responses to track only booking call
          const bookingResponses: any[] = [];
          const onResponse = (response: any) => {
            if (response.url().includes('book') || response.url().includes('rpc')) {
              bookingResponses.push({
                url: response.url(),
                status: response.status()
              });
            }
          };
          page.on('response', onResponse);
          
          await confirmBtn.click();
          await page.waitForTimeout(2000);
          
          page.removeListener('response', onResponse);
          log('Booking request sent', { responses: bookingResponses.length });

          // Step 6: Check for success/error
          log('Checking for result toast');
          await page.screenshot({ path: `${debugDir}/05-result.png` });

          const successMsg = await page.locator('text=/success|booked|confirmed/i').first().textContent().catch(() => null);
          const errorMsg = await page.locator('text=/error|failed|problem/i').first().textContent().catch(() => null);

          if (successMsg) {
            log('SUCCESS! Booking message:', { message: successMsg });
            logs.final_status = 'SUCCESS';
          } else if (errorMsg) {
            log('ERROR! Booking failed:', { message: errorMsg });
            logs.final_status = 'BOOKING_FAILED';
          } else {
            log('No clear message found');
            logs.final_status = 'UNCLEAR';
          }
        } else {
          log('Confirm button not found', { possible_buttons: await page.locator('button').count() });
          logs.final_status = 'NO_CONFIRM_BUTTON';
        }
      } else {
        log('Book button not found', { possible_buttons: await page.locator('button').count() });
        logs.final_status = 'NO_BOOK_BUTTON';
      }
    }

  } catch (error: any) {
    log('Test error', { error: error.message, stack: error.stack?.substring(0, 200) });
    logs.final_status = 'ERROR';
  }

  // Save all logs
  fs.writeFileSync(`${debugDir}/complete-log.json`, JSON.stringify(logs, null, 2));
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 BOOKING FLOW TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`Final Status: ${logs.final_status}`);
  console.log(`Total Requests: ${logs.requests.length}`);
  console.log(`Total Responses: ${logs.responses.length}`);
  console.log(`Total Errors: ${logs.errors.length}`);
  console.log(`Steps Completed: ${logs.steps.length}`);
  
  if (logs.errors.length > 0) {
    console.log('\n🔴 ERRORS CAPTURED:');
    logs.errors.forEach((err, i) => {
      console.log(`${i + 1}. [${err.type}] ${err.message}`);
    });
  }

  console.log('\n✅ Full logs saved to debug/booking-flow-complete/complete-log.json');
});

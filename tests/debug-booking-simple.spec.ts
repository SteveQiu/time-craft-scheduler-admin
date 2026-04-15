import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Reproduce booking error - simple direct flow', async ({ page, context }) => {
  // Create debug directory if it doesn't exist
  const debugDir = path.join(process.cwd(), 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  // Capture console messages
  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];
  
  page.on('console', msg => {
    const logEntry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    console.log(logEntry);
    if (msg.type() === 'error') {
      consoleErrors.push(logEntry);
    }
    consoleLogs.push(logEntry);
  });

  // Capture RPC responses
  const rpcResponses: any[] = [];
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('book_opening')) {
      try {
        const text = await response.text();
        const status = response.status();
        const entry = {
          url,
          status,
          body: text,
          timestamp: new Date().toISOString()
        };
        rpcResponses.push(entry);
        console.log(`[RPC] book_opening - Status: ${status}`);
        if (text) console.log(`  Response: ${text.substring(0, 200)}`);
      } catch (e) {
        console.log(`Could not read response body for ${url}`);
      }
    }
  });

  try {
    console.log('\n=== Test Setup ===\n');
    console.log('This test tries to book an opening after signing in.\n');

    // For this to work, we need to:
    // 1. Get a valid opening ID (manually from DB or from browse page)
    // 2. Sign in if needed
    // 3. Navigate to /openings/{id}
    // 4. Click Book button
    // 5. Capture any errors

    console.log('Step 1: Navigate to browse page to find an opening\n');
    await page.goto('http://localhost:8080/browse');
    await page.waitForLoadState('networkidle');
    
    // The page should load with 325 available appointments
    const hasAppointments = await page.locator('text=available slots').isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  Appointments loaded: ${hasAppointments}`);
    
    // Try a direct approach: navigate to a specific provider first
    const testOrgLink = page.locator('text=Test Org');
    const hasTestOrg = await testOrgLink.isVisible();
    console.log(`  Test Org provider found: ${hasTestOrg}\n`);

    if (hasTestOrg) {
      await testOrgLink.click();
      await page.waitForLoadState('networkidle');
      console.log('Step 2: Navigated to Test Org provider detail\n');

      await page.screenshot({ path: path.join(debugDir, 'browse-detail.png') });

      // Now try to extract an opening ID from visible elements
      // Look at the HTML to find if there are opening IDs
      const pageHTML = await page.content();
      
      // Try to find /openings/ URLs in the HTML
      const matches = pageHTML.match(/\/openings\/[a-f0-9-]{36}/g);
      if (matches && matches.length > 0) {
        const openingUrl = matches[0];
        const openingId = openingUrl.split('/').pop();
        console.log(`Step 3: Found opening ID: ${openingId}`);
        console.log(`  Navigating to /openings/${openingId}\n`);

        // Navigate to the opening detail page
        await page.goto(`http://localhost:8080/openings/${openingId}`);
        await page.waitForLoadState('networkidle');

        await page.screenshot({ path: path.join(debugDir, 'opening-detail.png') });

        // Now look for Book button
        const bookBtn = page.locator('button').filter({ hasText: /Book/ }).first();
        const bookBtnVisible = await bookBtn.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (bookBtnVisible) {
          console.log(`Step 4: Found Book button, clicking...\n`);
          await bookBtn.click();
          await page.waitForTimeout(1500);

          // Check for sign-in dialog
          const signInDialog = page.locator('[role="dialog"]').filter({ hasText: /Sign|Log/i });
          const signInVisible = await signInDialog.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (signInVisible) {
            console.log(`Step 5a: Sign-in dialog appeared (not signed in)\n`);
            await page.screenshot({ path: path.join(debugDir, 'signin-dialog.png') });
            
            // Try to find any test credentials or skip this
            console.log('Note: Would need to sign in to proceed with booking');
          } else {
            // Wait for response
            await page.waitForTimeout(2000);

            // Check for error
            const errorToast = page.locator('text=Failed to book appointment');
            const hasError = await errorToast.isVisible({ timeout: 1000 }).catch(() => false);
            
            if (hasError) {
              console.log(`Step 5b: ❌ ERROR detected: "Failed to book appointment" toast appeared\n`);
              await page.screenshot({ path: path.join(debugDir, 'error-toast.png') });
            } else {
              console.log(`Step 5b: No immediate error (booking may have succeeded or dialog appeared)\n`);
            }

            await page.screenshot({ path: path.join(debugDir, 'after-book-click.png') });
          }
        } else {
          console.log(`Step 4: ✗ Book button not found\n`);
          const pageTitle = await page.title();
          const url = page.url();
          console.log(`  URL: ${url}`);
          console.log(`  Title: ${pageTitle}`);
        }
      } else {
        console.log('  ⚠ Could not find opening URLs in page HTML');
      }
    }

    // Wait for any final network calls
    await page.waitForLoadState('networkidle');

  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: path.join(debugDir, 'error-screenshot.png') });
  }

  console.log('\n=== ANALYSIS ===\n');

  // Save console logs
  const consoleLogPath = path.join(debugDir, 'console-logs-simple.txt');
  fs.writeFileSync(consoleLogPath, consoleLogs.join('\n'));
  console.log(`✓ Console logs saved to console-logs-simple.txt`);

  if (consoleErrors.length > 0) {
    console.log('\n❌ CONSOLE ERRORS FOUND:');
    consoleErrors.forEach(error => console.log('  ' + error));
  }

  // Save RPC responses
  const networkPath = path.join(debugDir, 'book-opening-responses.json');
  fs.writeFileSync(networkPath, JSON.stringify(rpcResponses, null, 2));
  console.log(`✓ book_opening RPC responses saved`);

  if (rpcResponses.length > 0) {
    console.log('\n📡 BOOK_OPENING RPC RESPONSES:');
    rpcResponses.forEach(resp => {
      console.log(`  Status: ${resp.status}`);
      console.log(`  Response: ${resp.body}`);
    });
  } else {
    console.log('\n  (No book_opening RPC calls made)');
  }
});

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Reproduce booking error and capture network/console details', async ({ page, context }) => {
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

  // Capture network errors and responses
  const networkErrors: any[] = [];
  const rpcResponses: any[] = [];
  
  page.on('response', async response => {
    const url = response.url();
    // Capture all Supabase RPC calls
    if (url.includes('/functions/v1') || url.includes('rpc')) {
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
        console.log(`[RPC Response] ${url} - Status: ${status}`);
        if (status >= 400) {
          console.log(`  Error Response: ${text}`);
        }
      } catch (e) {
        console.log(`Could not read response body for ${url}`);
      }
    }
  });

  page.on('requestfailed', request => {
    const entry = {
      url: request.url(),
      failure: request.failure(),
      timestamp: new Date().toISOString()
    };
    networkErrors.push(entry);
    console.log(`[Network Error] ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    // First, get a real opening ID by querying the database through the browse page
    console.log('\n=== STEP 1: Get opening ID from browse page ===\n');
    await page.goto('http://localhost:8080/browse');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(debugDir, '01-browse-list.png') });
    
    // Check network tab for any RPC responses that contain opening IDs
    // By examining what the page loaded, we can get provider ID
    const pageContent = await page.content();
    console.log(`✓ Browse page loaded (${pageContent.length} bytes)`);
    
    // Get provider ID from URL after clicking on provider
    console.log('\n=== STEP 2: Click provider to get provider ID ===\n');
    await page.locator('text=Test Org').first().click();
    await page.waitForLoadState('networkidle');
    const browseDetailUrl = page.url();
    console.log(`Current URL: ${browseDetailUrl}`);
    
    const providerId = browseDetailUrl.split('/').pop();
    console.log(`Provider ID: ${providerId}`);
    
    await page.screenshot({ path: path.join(debugDir, '02-browse-detail.png') });

    // Now query for an opening ID by navigating to an opening directly
    // First, let's check if there's an external link to an opening
    console.log('\n=== STEP 3: Find and navigate to an opening ===\n');
    
    // Wait a moment for page to fully load
    await page.waitForTimeout(1000);
    
    // Look for any opening cards with time info
    const timeSlots = page.locator('[class*="border"][class*="rounded"]').filter({ hasText: /\d+h/ });
    const slotCount = await timeSlots.count();
    console.log(`Found ${slotCount} time slot cards`);
    
    if (slotCount > 0) {
      // Try to find external link button
      const firstSlot = timeSlots.first();
      const externalLinkBtn = firstSlot.locator('button').filter({ hasText: /External/ }).first();
      const hasExternalLink = await externalLinkBtn.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (hasExternalLink) {
        console.log('Found external link button, clicking to open in new context...');
        
        // Get the link from the button's onclick or parent
        const href = await externalLinkBtn.evaluate((el) => {
          const parent = el.closest('[class*="border"]');
          if (!parent) return null;
          // Try to find any /openings/ link
          const link = parent.querySelector('a[href*="/openings/"]');
          return link?.getAttribute('href');
        });
        
        if (href) {
          console.log(`Opening href: ${href}`);
          await page.goto(`http://localhost:8080${href}`);
          await page.waitForLoadState('networkidle');
          console.log(`✓ Navigated to opening detail: ${page.url()}`);
        }
      }
    }
    
    await page.screenshot({ path: path.join(debugDir, '03-opening-detail.png') });

    console.log('\n=== STEP 4: Click Book button ===\n');
    
    const bookButton = page.locator('button').filter({ hasText: /Book/ }).first();
    const bookButtonVisible = await bookButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (bookButtonVisible) {
      console.log('  ✓ Book button found');
      console.log('  - Clicking Book button...');
      await bookButton.click();
      await page.waitForTimeout(1500);
      console.log('  ✓ Book button clicked');

      // Check for dialogs
      const dialogs = page.locator('[role="dialog"]');
      const dialogCount = await dialogs.count();
      console.log(`  Found ${dialogCount} dialog(s)`);

      // Wait for any error or success messages
      await page.waitForTimeout(2000);
      
      // Check for error toast
      const errorToast = page.locator('text=Failed to book appointment');
      const hasError = await errorToast.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (hasError) {
        console.log('  ❌ ERROR: "Failed to book appointment" toast appeared');
        await page.screenshot({ path: path.join(debugDir, '04-error-screenshot.png') });
      } else {
        const successToast = page.locator('text=booked successfully');
        const hasSuccess = await successToast.isVisible({ timeout: 1000 }).catch(() => false);
        if (hasSuccess) {
          console.log('  ✓ Success: Booking succeeded');
        }
      }
    } else {
      console.log('  ✗ Book button not found on opening detail page');
      console.log(`  Page URL: ${page.url()}`);
      console.log(`  Page title: ${await page.title()}`);
    }

    await page.screenshot({ path: path.join(debugDir, '05-final-state.png') });
    
    // Wait a bit more for any network calls
    await page.waitForLoadState('networkidle');

  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: path.join(debugDir, '99-error-screenshot.png') });
  }

  console.log('\n=== ANALYSIS ===\n');

  // Save console logs
  const consoleLogPath = path.join(debugDir, 'console-logs.txt');
  fs.writeFileSync(consoleLogPath, consoleLogs.join('\n'));
  console.log(`✓ Console logs saved to ${consoleLogPath}`);

  if (consoleErrors.length > 0) {
    console.log('\n❌ CONSOLE ERRORS FOUND:');
    consoleErrors.forEach(error => console.log('  ' + error));
  }

  // Save network responses
  const networkPath = path.join(debugDir, 'network-responses.json');
  fs.writeFileSync(networkPath, JSON.stringify(rpcResponses, null, 2));
  console.log(`✓ Network responses saved to ${networkPath}`);

  if (rpcResponses.length > 0) {
    console.log('\n📡 RPC RESPONSES:');
    rpcResponses.forEach(resp => {
      console.log(`  ${resp.url}`);
      console.log(`    Status: ${resp.status}`);
      if (resp.status >= 400) {
        console.log(`    Error: ${resp.body}`);
      }
    });
  }

  if (networkErrors.length > 0) {
    console.log('\n❌ NETWORK ERRORS FOUND:');
    const networkErrorPath = path.join(debugDir, 'network-errors.json');
    fs.writeFileSync(networkErrorPath, JSON.stringify(networkErrors, null, 2));
    networkErrors.forEach(error => console.log('  ' + error.url + ': ' + error.failure?.errorText));
  }

  console.log('\n=== SCREENSHOTS SAVED ===\n');
  console.log('  01-browse-list.png');
  console.log('  02-browse-detail.png');
  console.log('  03-before-booking.png');
  console.log('  04-after-booking-error.png');
  console.log('  (+ any error screenshots)');
});

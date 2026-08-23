import { test } from '@playwright/test';
import fs from 'fs';

test('Detailed Booking Error Capture', async ({ page }) => {
  const debugDir = 'debug/booking-error-capture';
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  const allRequests: any[] = [];
  const allResponses: any[] = [];
  const consoleLogs: any[] = [];

  // Capture all requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('supabase') || url.includes('rpc') || url.includes('/rest/')) {
      allRequests.push({
        url,
        method: request.method(),
        headers: request.headers()
      });
    }
  });

  // Capture all responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('supabase') || url.includes('rpc') || url.includes('/rest/')) {
      try {
        const body = await response.text();
        allResponses.push({
          url,
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
          body: body.substring(0, 1000) // First 1000 chars
        });
      } catch (e) {
        allResponses.push({
          url,
          status: response.status(),
          statusText: response.statusText(),
          error: 'Could not read body'
        });
      }
    }
  });

  // Capture console
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location().url
    });
  });

  console.log('1. Loading app...');
  await page.goto('http://localhost:8080/openings/f0927dd8-9e7d-4830-a6b5-c96a3c627fe9');
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
    // Ignore timeout on networkidle
  });
  await page.waitForTimeout(1000);

  console.log('2. Checking if signed in...');
  const signInVisible = await page.locator('button:has-text("Sign In")').isVisible().catch(() => {
    // Default to false if check fails
    return false;
  });
  const signOutVisible = await page.locator('button:has-text("Sign Out")').isVisible().catch(() => {
    // Default to false if check fails
    return false;
  });

  console.log('   Sign In button:', signInVisible);
  console.log('   Sign Out button:', signOutVisible);

  if (signOutVisible) {
    console.log('   ✅ User is signed in');
  } else {
    console.log('   ❌ User is NOT signed in - need to skip booking test');
    console.log('   NOTE: Playwright tests cannot persist authentication between sessions');
    console.log('   To test booking, sign in manually in browser then try booking');
    
    fs.writeFileSync(`${debugDir}/note.txt`, 
      'Cannot test booking in Playwright because authentication requires OAuth redirect.\n' +
      'The test environment cannot persist session across page navigations.\n\n' +
      'To manually test:\n' +
      '1. Go to http://localhost:8080/openings/f0927dd8-9e7d-4830-a6b5-c96a3c627fe9\n' +
      '2. Click Sign In\n' +
      '3. Sign in with Google or email/password\n' +
      '4. You\'ll be redirected back to the opening\n' +
      '5. Click Book\n' +
      '6. Open browser DevTools (F12)\n' +
      '7. Go to Network tab\n' +
      '8. Confirm booking\n' +
      '9. Look for "book_opening" RPC call\n' +
      '10. Check the response for error details'
    );

    return;
  }

  console.log('3. Looking for Book button...');
  const bookButton = page.locator('button:has-text("Book")');
  const bookVisible = await bookButton.isVisible();

  if (!bookVisible) {
    console.log('   ❌ Book button not found');
    return;
  }

  console.log('   ✅ Book button found, clicking...');
  await bookButton.click();
  await page.waitForTimeout(500);

  console.log('4. Looking for confirmation dialog...');
  const confirmBtn = page.locator('button:has-text("Confirm")').first();
  const confirmVisible = await confirmBtn.isVisible().catch(() => {
    // Default to false if check fails
    return false;
  });

  if (!confirmVisible) {
    console.log('   ❌ Confirm button not found');
    await page.screenshot({ path: `${debugDir}/no-confirm-button.png` });
    return;
  }

  console.log('   ✅ Confirm button found, clicking...');
  
  // Clear previous responses and capture only the booking request
  const bookingResponses: any[] = [];
  const unsubscribe = page.on('response', async response => {
    const url = response.url();
    if (url.includes('book_opening') || url.includes('rpc')) {
      try {
        const body = await response.text();
        bookingResponses.push({
          url,
          status: response.status(),
          body: body
        });
      } catch (e) {
        bookingResponses.push({
          url,
          status: response.status(),
          error: String(e)
        });
      }
    }
  });

  await confirmBtn.click();
  await page.waitForTimeout(2000);

  console.log('\n📊 Booking Request/Response Analysis:');
  console.log('Total requests:', allRequests.length);
  console.log('Total responses:', allResponses.length);
  console.log('Booking-specific responses:', bookingResponses.length);

  // Save all data
  fs.writeFileSync(`${debugDir}/all-requests.json`, JSON.stringify(allRequests, null, 2));
  fs.writeFileSync(`${debugDir}/all-responses.json`, JSON.stringify(allResponses, null, 2));
  fs.writeFileSync(`${debugDir}/booking-responses.json`, JSON.stringify(bookingResponses, null, 2));
  fs.writeFileSync(`${debugDir}/console-logs.json`, JSON.stringify(consoleLogs, null, 2));

  // Check for error toast
  await page.waitForTimeout(500);
  const errorToast = await page.locator('text=/failed|error/i').first().textContent().catch(() => {
    // Return null if element not found
    return null;
  });
  const successToast = await page.locator('text=success|booked|confirmed').first().textContent().catch(() => {
    // Return null if element not found
    return null;
  });

  console.log('\nError toast:', errorToast);
  console.log('Success toast:', successToast);

  // Find RPC error in responses
  const rpcErrors = bookingResponses.filter(r => r.status >= 400 || r.body?.includes('error'));
  if (rpcErrors.length > 0) {
    console.log('\n🔴 RPC ERRORS FOUND:');
    rpcErrors.forEach(err => {
      console.log(`- Status ${err.status}: ${err.body?.substring(0, 200)}`);
    });
  }

  await page.screenshot({ path: `${debugDir}/result.png` });
});

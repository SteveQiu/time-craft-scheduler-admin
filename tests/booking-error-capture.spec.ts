import { test } from '@playwright/test';

test.describe('Booking Error Capture', () => {
  test('capture exact booking error message', async ({ page, _context }) => {
    // Listen to all console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      console.log(`[${msg.type()}] ${msg.text()}`);
    });

    // Listen to all responses to capture errors
    const responses: any[] = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('rpc') || url.includes('supabase')) {
        try {
          const text = await response.text();
          responses.push({
            url,
            status: response.status(),
            body: text.substring(0, 500) // First 500 chars
          });
          console.log(`Response: ${response.status()} from ${url}`);
          console.log(`Body: ${text.substring(0, 500)}`);
        } catch (e) {
          console.log('Could not read response body');
        }
      }
    });

    // Navigate to app
    await page.goto('http://localhost:8080/auth');
    
    // Sign in with credentials from .secret
    await page.fill('input[type="email"]', 'aaa@aaa.com');
    await page.fill('input[type="password"]', 'aaaaaa');
    await page.click('button:has-text("Sign In")');
    
    // Wait for auth
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Signed in');

    // Navigate to browse
    await page.goto('http://localhost:8080/browse');
    await page.waitForLoadState('networkidle');
    
    // Look for a provider to book from
    const providerLinks = await page.$$('a[href*="/browse/"]');
    console.log(`Found ${providerLinks.length} providers`);
    
    if (providerLinks.length === 0) {
      console.log('❌ No providers found!');
      return;
    }

    // Click first provider
    await providerLinks[0].click();
    await page.waitForLoadState('networkidle');
    
    // Wait for any Book button
    const bookButtons = await page.$$('button:has-text("Book")');
    console.log(`Found ${bookButtons.length} book buttons`);
    
    if (bookButtons.length === 0) {
      console.log('❌ No book buttons found!');
      console.log('Console logs:', consoleLogs);
      console.log('Network responses:', responses);
      return;
    }

    // Click first book button
    await bookButtons[0].click();
    
    // Wait for dialog and capture any errors
    await page.waitForSelector('text=Confirm Booking', { timeout: 5000 });
    console.log('✅ Booking dialog appeared');

    // Click confirm
    await page.click('button:has-text("Confirm Booking")');
    
    // Wait a bit for the request to be made
    await page.waitForTimeout(2000);

    // Check for error message
    const errorToast = await page.$('text=Failed to book');
    if (errorToast) {
      console.log('❌ Got error toast!');
    }

    // Log all responses that came through
    console.log('\n=== ALL NETWORK RESPONSES ===');
    responses.forEach(r => {
      console.log(`${r.status} ${r.url}`);
      console.log(`Body: ${r.body}`);
    });

    console.log('\n=== ALL CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));

    // Take screenshot
    await page.screenshot({ path: 'debug/booking-error.png' });
  });
});

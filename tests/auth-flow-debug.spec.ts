import { requireTestSecret } from './testCredentials.js';
import { test } from '@playwright/test';

test.describe('Auth Flow Debug', () => {
  test('Test sign in flow', async ({ page }) => {
    console.log('\n=== Testing Sign In Flow ===\n');

    // Navigate to auth page
    console.log('1. Navigate to /auth');
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Check for form
    console.log('2. Look for email input');
    const emailInput = await page.$('input[type="email"]');
    if (!emailInput) {
      console.log('❌ No email input found!');
      await page.screenshot({ path: 'debug/auth-form-missing.png' });
      return;
    }
    console.log('✅ Found email input');

    // Fill form
    console.log('3. Fill credentials: aaa@aaa.com / aaaaaa');
    await page.fill('input[type="email"]', 'aaa@aaa.com');
    await page.fill('input[type="password"]', requireTestSecret('TESTER1_PASSWORD1'));
    await page.screenshot({ path: 'debug/auth-form-filled.png' });

    // Submit form (try pressing Enter)
    console.log('4. Submit form by pressing Enter');
    await page.press('input[type="password"]', 'Enter');

    // Wait for navigation or error
    console.log('5. Waiting for response...');
    await page.waitForTimeout(3000);

    // Check current URL
    const url = page.url();
    console.log(`   Current URL: ${url}`);

    // Check for error messages
    const errorMsg = await page.$('text=/Error|error|failed|Failed/').catch(() => null);
    if (errorMsg) {
      const text = await errorMsg.textContent();
      console.log(`❌ Error message: ${text}`);
    }

    // Check for redirect
    if (url.includes('/dashboard')) {
      console.log('✅ Redirected to dashboard!');
      await page.screenshot({ path: 'debug/auth-success.png' });
    } else if (url.includes('/browse')) {
      console.log('✅ Redirected to browse!');
      await page.screenshot({ path: 'debug/auth-browse.png' });
    } else {
      console.log(`⚠️  Still on auth page or somewhere else: ${url}`);
      await page.screenshot({ path: 'debug/auth-stuck.png' });
      
      // Try to look for any content
      const content = await page.textContent('body');
      console.log(`Page content length: ${content?.length || 0}`);
      console.log(`First 200 chars: ${content?.substring(0, 200) || 'empty'}`);
    }

    // Try to navigate to browse manually
    console.log('\n6. Try manual navigation to /browse');
    await page.goto('http://localhost:8080/browse');
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Check authentication status
    const signOutBtn = await page.$('button:has-text("Sign Out")').catch(() => null);
    if (signOutBtn) {
      console.log('✅ Found Sign Out button - user is authenticated!');
    } else {
      console.log('❌ No Sign Out button - user NOT authenticated');
    }

    // Check for providers
    const providerLinks = await page.$$('a[href*="/browse/"]');
    console.log(`Found ${providerLinks.length} provider links (a[href*="/browse/"])`);
    
    // Try alternative selectors
    const allLinks = await page.$$('a');
    console.log(`Total links on page: ${allLinks.length}`);
    
    const browseLinks = await page.$$('a[href*="browse"]');
    console.log(`Links with "browse" in href: ${browseLinks.length}`);
    
    // Try to find Test Org specifically
    const testOrgLink = await page.$('text=Test Org');
    if (testOrgLink) {
      console.log('Found "Test Org" text on page!');
      const parent = await testOrgLink.evaluate(el => {
        let current = el;
        while (current && current.tagName !== 'A') {
          current = current.parentElement;
        }
        return current ? (current as HTMLAnchorElement).href : null;
      });
      console.log(`Parent link: ${parent}`);
    }
    
    // Get sample href values
    const hrefs = await page.$$eval('a', links => links.slice(0, 10).map(l => l.getAttribute('href')));
    console.log(`Sample hrefs: ${JSON.stringify(hrefs, null, 2)}`);

    if (providerLinks.length === 0 && browseLinks.length > 0) {
      console.log('\n✅ FOUND: Using alternative selector for browse links');
      providerLinks.push(...browseLinks);
    }

    if (providerLinks.length === 0) {
      console.log('\n❌ Problem: No providers shown even though data exists!');
      
      // Try to get more information from React
      const reactDebug = await page.evaluate(() => {
        // Try to find React root and get state
        const body = document.body.innerHTML;
        const hasProviders = body.includes('provider') || body.includes('Provider') || body.includes('Test Org');
        const hasLoading = body.includes('Loading') || body.includes('loading');
        const hasError = body.includes('Error') || body.includes('error');
        
        return {
          bodyLength: body.length,
          hasProviders,
          hasLoading,
          hasError,
          bodyPreview: body.substring(0, 500)
        };
      });
      
      console.log('React debug info:');
      console.log(`  - Body length: ${reactDebug.bodyLength}`);
      console.log(`  - Has "provider/Provider/Test Org": ${reactDebug.hasProviders}`);
      console.log(`  - Has "Loading": ${reactDebug.hasLoading}`);
      console.log(`  - Has "Error": ${reactDebug.hasError}`);
      
      console.log('\nPossible causes:');
      console.log('- User not authenticated');
      console.log('- Component not loading data');
      console.log('- RLS policy blocking access');
      console.log('- React query not fetching');
      
      await page.screenshot({ path: 'debug/browse-no-providers.png' });
    } else {
      console.log('\n✅ Success: Providers are displayed!');
      await page.screenshot({ path: 'debug/browse-with-providers.png' });
    }
  });
});

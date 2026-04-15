import { test } from '@playwright/test';
import fs from 'fs';

test('Browse Detail Page - Book Opening Debug', async ({ page }) => {
  const debugDir = 'debug/browse-book-debug';
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  const consoleLogs: any[] = [];
  const networkErrors: any[] = [];
  const pageErrors: any[] = [];

  // Capture console messages
  page.on('console', msg => {
    const log = { type: msg.type(), text: msg.text() };
    consoleLogs.push(log);
    if (msg.type() === 'error') {
      console.log('🔴 CONSOLE ERROR:', msg.text());
    }
  });

  // Capture network errors and RPC calls
  page.on('response', response => {
    const url = response.url();
    
    // Capture RPC calls
    if (url.includes('rpc/') || url.includes('/rest/')) {
      const status = response.status();
      if (status >= 400) {
        networkErrors.push({
          url,
          status,
          statusText: response.statusText()
        });
        console.log(`🔴 NETWORK ERROR [${status}]: ${url}`);
      }
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
    console.log('🔴 PAGE ERROR:', error.message);
  });

  console.log('1. Signing in with test account...');
  // First go to auth page
  await page.goto('http://localhost:8080/auth');
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

  // Sign in with email/password
  await page.fill('#signin-email', 'test@example.com');
  await page.fill('#signin-password', 'password123');
  
  const signInBtn = page.locator('button:has-text("Sign In")').first();
  await signInBtn.click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
    console.log('⚠️ Not redirected to dashboard, checking current URL:', page.url());
  });
  
  await page.waitForTimeout(1000);
  console.log('✅ Signed in, current URL:', page.url());
  await page.screenshot({ path: `${debugDir}/01-after-signin.png` });

  console.log('2. Navigating to browse detail page...');
  const openingId = 'f0927dd8-9e7d-4830-a6b5-c96a3c627fe9';
  await page.goto(`http://localhost:8080/browse/${openingId}`);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);
  
  console.log('2.1 Current URL:', page.url());
  await page.screenshot({ path: `${debugDir}/02-browse-page.png` });

  // Check for page content
  const pageContent = await page.evaluate(() => {
    return {
      title: document.title,
      bodyText: document.body.innerText.substring(0, 500),
      hasBookButton: !!Array.from(document.querySelectorAll('button')).some(b => b.textContent?.includes('Book')),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent)
    };
  });

  console.log('2.2 Page content:', {
    title: pageContent.title,
    hasBookButton: pageContent.hasBookButton,
    buttons: pageContent.buttons
  });

  console.log('3. Looking for Book button...');
  const bookButton = page.locator('button:has-text("Book")').first();
  const bookVisible = await bookButton.isVisible().catch(() => false);
  
  console.log('3.1 Book button visible:', bookVisible);
  
  if (bookVisible) {
    console.log('3.2 Clicking Book button...');
    await bookButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${debugDir}/03-after-book-click.png` });

    // Check for confirmation dialog
    const confirmDialog = page.locator('[role="alertdialog"]').first();
    const dialogVisible = await confirmDialog.isVisible().catch(() => false);
    console.log('3.3 Confirmation dialog visible:', dialogVisible);

    if (dialogVisible) {
      await page.screenshot({ path: `${debugDir}/04-confirm-dialog.png` });

      // Find and click confirm button
      const confirmBtn = page.locator('button:has-text("Confirm")').first();
      const confirmBtnVisible = await confirmBtn.isVisible().catch(() => false);
      console.log('3.4 Confirm button visible:', confirmBtnVisible);

      if (confirmBtnVisible) {
        console.log('3.5 Clicking Confirm button...');
        await confirmBtn.click();
        
        // Wait for response/error
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${debugDir}/05-after-confirm.png` });

        // Check for error toast
        const errorToast = page.locator('text="Failed to book"').first();
        const successToast = page.locator('text="successfully"').first();
        
        const errorVisible = await errorToast.isVisible().catch(() => false);
        const successVisible = await successToast.isVisible().catch(() => false);

        console.log('3.6 Error toast visible:', errorVisible);
        console.log('3.7 Success toast visible:', successVisible);

        if (errorVisible) {
          const errorText = await errorToast.textContent();
          console.log('3.8 Error message:', errorText);
        }
      }
    }
  } else {
    console.log('❌ Book button not found on page');
    const allText = await page.textContent('body');
    console.log('Page text (first 1000 chars):', allText?.substring(0, 1000));
  }

  // Save debug data
  fs.writeFileSync(`${debugDir}/console-logs.json`, JSON.stringify(consoleLogs, null, 2));
  fs.writeFileSync(`${debugDir}/network-errors.json`, JSON.stringify(networkErrors, null, 2));
  fs.writeFileSync(`${debugDir}/page-errors.json`, JSON.stringify(pageErrors, null, 2));

  console.log('\n📊 Debug Summary:');
  console.log(`- Console logs: ${consoleLogs.length}`);
  console.log(`- Network errors: ${networkErrors.length}`);
  console.log(`- Page errors: ${pageErrors.length}`);
  console.log(`- Debug data saved to: ${debugDir}/`);
});

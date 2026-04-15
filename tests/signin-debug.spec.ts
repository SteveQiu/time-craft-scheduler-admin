import { test, expect } from '@playwright/test';
import fs from 'fs';

test('Sign In Dialog - Debug After Sign Out', async ({ page }) => {
  // Create debug directory
  const debugDir = 'debug/signin-debug';
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  // Capture all console messages
  const consoleLogs: any[] = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      args: msg.args().length
    });
  });

  // Navigate to app
  console.log('1. Navigating to app...');
  await page.goto('http://localhost:8080');
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

  // Wait a bit for auth to initialize
  await page.waitForTimeout(1000);

  // Take initial screenshot
  await page.screenshot({ path: `${debugDir}/01-initial.png` });

  // Check if signed in - look for buttons with text using Playwright locator API
  const hasSignOutButton = await page.locator('button:has-text("Sign Out")').isVisible().catch(() => false);
  const hasSignInButton = await page.locator('button:has-text("Sign In")').isVisible().catch(() => false);
  
  const authStatus = {
    hasSignOutButton,
    hasSignInButton,
  };

  console.log('Auth status:', authStatus);
  fs.writeFileSync(`${debugDir}/auth-status-before.json`, JSON.stringify(authStatus, null, 2));

  // Look for sign out button and click it
  if (hasSignOutButton) {
    console.log('2. Found Sign Out button, clicking...');
    await page.locator('button:has-text("Sign Out")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${debugDir}/02-after-signout.png` });
  } else {
    console.log('2. Sign Out button not found, user might already be signed out');
  }

  // Check auth status after sign out
  const hasSignOutButtonAfter = await page.locator('button:has-text("Sign Out")').isVisible().catch(() => false);
  const hasSignInButtonAfter = await page.locator('button:has-text("Sign In")').isVisible().catch(() => false);
  
  const authStatusAfter = {
    hasSignOutButton: hasSignOutButtonAfter,
    hasSignInButton: hasSignInButtonAfter,
  };
  console.log('Auth status after:', authStatusAfter);
  fs.writeFileSync(`${debugDir}/auth-status-after-signout.json`, JSON.stringify(authStatusAfter, null, 2));

  // Now look for Sign In button
  const signInButtons = page.locator('button:has-text("Sign In")');
  const signInCount = await signInButtons.count();
  console.log(`3. Found ${signInCount} Sign In buttons`);

  if (signInCount > 0) {
    const firstSignInBtn = signInButtons.first();
    console.log('3.1 Clicking first Sign In button...');
    await firstSignInBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${debugDir}/03-signin-clicked.png` });

    // Check if navigated to /auth page instead of dialog
    const currentUrl = page.url();
    console.log('3.2 Current URL after click:', currentUrl);
    
    if (currentUrl.includes('/auth')) {
      console.log('3.3 ✅ Navigation to /auth successful!');
      
      // Check for sign in form
      const emailInput = page.locator('#signin-email');
      const emailExists = await emailInput.isVisible().catch(() => false);
      console.log('3.4 Email input visible:', emailExists);
      
      if (emailExists) {
        console.log('3.5 ✅ Sign in form is visible - sign in flow working!');
        await page.screenshot({ path: `${debugDir}/04-signin-form.png` });
      }
    } else {
      // Old test for dialog
      const dialogOpen = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      console.log('3.2 Dialog opened:', dialogOpen);

      if (dialogOpen) {
        await page.screenshot({ path: `${debugDir}/04-dialog-open.png` });

        // Look for email field
        const emailInput = page.locator('#dialog-signin-email');
        const emailExists = await emailInput.isVisible().catch(() => false);
        console.log('3.3 Email field visible:', emailExists);

        if (emailExists) {
          console.log('3.4 Focusing email field...');
          await emailInput.focus();
          await emailInput.fill('test@example.com');
          await page.screenshot({ path: `${debugDir}/05-email-filled.png` });
        } else {
          console.log('3.4 Email field NOT visible');
          
          // Debug: get all inputs in dialog
          const allInputs = await page.locator('input').all();
          console.log(`   Found ${allInputs.length} input fields total`);
          
          for (let i = 0; i < allInputs.length; i++) {
            const input = allInputs[i];
            const type = await input.getAttribute('type');
            const id = await input.getAttribute('id');
            const visible = await input.isVisible().catch(() => false);
            console.log(`   Input ${i}: type=${type}, id=${id}, visible=${visible}`);
          }

          // Get dialog content
          const dialogContent = await page.locator('[role="dialog"]').innerHTML();
          fs.writeFileSync(`${debugDir}/dialog-html.txt`, dialogContent);
          console.log('   Dialog HTML saved to dialog-html.txt');
        }

        // Look for password field
        const passwordInput = page.locator('#dialog-signin-password');
        const passwordExists = await passwordInput.isVisible().catch(() => false);
        console.log('3.5 Password field visible:', passwordExists);

        // Look for tabs
        const tabs = page.locator('[role="tablist"]');
        const tabsVisible = await tabs.isVisible().catch(() => false);
        console.log('3.6 Tabs visible:', tabsVisible);

        // Get all visible text in dialog
        const dialogText = await page.locator('[role="dialog"]').allTextContents();
        console.log('3.7 Dialog text content:', dialogText);
      }
    }
  } else {
    console.log('3. ERROR: No Sign In buttons found!');
  }

  // Save all console logs
  fs.writeFileSync(`${debugDir}/console-logs.json`, JSON.stringify(consoleLogs, null, 2));

  // Take final screenshot
  await page.screenshot({ path: `${debugDir}/99-final.png` });

  console.log('\n✅ Debug screenshots and data saved to debug/signin-debug/');
  console.log(`Console logs: ${consoleLogs.length} messages`);
});

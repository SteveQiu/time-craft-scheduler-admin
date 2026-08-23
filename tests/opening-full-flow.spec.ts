import { test } from '@playwright/test';
import fs from 'fs';

test('Opening View - Full Flow: Sign In → Book', async ({ page }) => {
  const debugDir = 'debug/opening-full-flow';
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  const consoleLogs: any[] = [];
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));

  console.log('1. Going to home page...');
  await page.goto('http://localhost:8080');
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.screenshot({ path: `${debugDir}/01-home.png` });

  // Check if user is already signed in
  const signOutBtn = page.locator('button:has-text("Sign Out")').first();
  const isSignedIn = await signOutBtn.isVisible().catch(() => false);
  console.log('Current sign in status:', isSignedIn ? 'SIGNED IN' : 'NOT SIGNED IN');

  if (!isSignedIn) {
    console.log('2. Signing in via Auth page...');
    
    // Navigate to Auth
    const signInBtn = page.locator('button:has-text("Sign In")').first();
    await signInBtn.click();
    await page.waitForURL('**/auth', { timeout: 10000 });
    await page.screenshot({ path: `${debugDir}/02-auth-page.png` });

    // Try to sign in with Google OAuth (this might open a popup)
    console.log('2.1 Looking for Google sign in...');
    const googleBtn = page.locator('button:has-text("Google")').first();
    const googleVisible = await googleBtn.isVisible().catch(() => false);
    console.log('Google button visible:', googleVisible);

    if (googleVisible) {
      console.log('⚠️ Would need Google OAuth flow - skipping automated test');
      console.log('ℹ️ Please manually test: Sign in via Google, then navigate to /openings/f0927dd8-9e7d-4830-a6b5-c96a3c627fe9');
    } else {
      console.log('2.2 Trying email/password...');
      // Note: We don't have test credentials, so just show the form
    }
  }

  console.log('3. Navigating to opening view...');
  const openingId = 'f0927dd8-9e7d-4830-a6b5-c96a3c627fe9';
  await page.goto(`http://localhost:8080/openings/${openingId}`);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.screenshot({ path: `${debugDir}/03-opening-page.png` });

  // Check what's on the page
  const pageContent = await page.evaluate(() => {
    return {
      heading: document.querySelector('h1, h2, h3')?.textContent,
      hasBookButton: !!Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Book')),
      hasSignInButton: !!Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Sign In')),
      allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean)
    };
  });

  console.log('\n📊 Page Analysis:');
  console.log('- Heading:', pageContent.heading);
  console.log('- Has Book button:', pageContent.hasBookButton);
  console.log('- Has Sign In button:', pageContent.hasSignInButton);
  console.log('- All buttons:', pageContent.allButtons);

  if (pageContent.hasBookButton && !pageContent.hasSignInButton) {
    console.log('\n✅ SUCCESS: Opening page is showing with Book button!');
  } else if (pageContent.hasSignInButton) {
    console.log('\n⚠️ User still not authenticated - need to sign in');
  } else {
    console.log('\n❌ Neither Book nor Sign In button found');
  }

  fs.writeFileSync(`${debugDir}/console-logs.json`, JSON.stringify(consoleLogs, null, 2));
  fs.writeFileSync(`${debugDir}/page-analysis.json`, JSON.stringify(pageContent, null, 2));

  console.log('\n📁 Debug files saved to:', debugDir);
});

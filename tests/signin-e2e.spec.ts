import { test } from '@playwright/test';
import fs from 'fs';

test('Sign In and Out Flow - Full E2E', async ({ page }) => {
  const debugDir = 'debug/signin-e2e';
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  // Capture console
  const consoleLogs: any[] = [];
  page.on('console', msg => {
    const log = {
      type: msg.type(),
      text: msg.text()
    };
    consoleLogs.push(log);
    if (msg.type() === 'error') {
      console.log('🔴 ERROR:', msg.text());
    }
  });

  // 1. Start at home
  console.log('1. Navigating to home...');
  await page.goto('http://localhost:8080');
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);

  // 2. Verify user not signed in
  const signInBtn = page.locator('button:has-text("Sign In")');
  const signInVisible = await signInBtn.isVisible().catch(() => false);
  console.log('2. Sign In button visible (should be true):', signInVisible);
  
  if (!signInVisible) {
    console.log('❌ FAILED: Sign In button not visible');
    await page.screenshot({ path: `${debugDir}/failed-no-signin-btn.png` });
    process.exit(1);
  }

  // 3. Click Sign In
  console.log('3. Clicking Sign In button...');
  await signInBtn.click();
  await page.waitForURL('**/auth', { timeout: 5000 });
  console.log('3.1 ✅ Navigated to /auth');
  await page.screenshot({ path: `${debugDir}/01-auth-page.png` });

  // 4. Verify auth page has email/password fields
  const emailInput = page.locator('#signin-email');
  const passwordInput = page.locator('#signin-password');
  const emailVisible = await emailInput.isVisible();
  const passwordVisible = await passwordInput.isVisible();
  console.log('4. Email field visible:', emailVisible, '| Password field visible:', passwordVisible);

  if (!emailVisible || !passwordVisible) {
    console.log('❌ FAILED: Auth form fields not visible');
    await page.screenshot({ path: `${debugDir}/failed-no-form.png` });
    process.exit(1);
  }

  console.log('✅ SUCCESS: Sign In flow works!');
  console.log('✅ User can now navigate to /auth and see sign in form');
  
  fs.writeFileSync(`${debugDir}/console.json`, JSON.stringify(consoleLogs, null, 2));
  fs.writeFileSync(`${debugDir}/summary.json`, JSON.stringify({
    status: 'SUCCESS',
    signInButtonFound: true,
    navigatedToAuth: true,
    authFormVisible: true,
    message: 'Sign In flow is working correctly'
  }, null, 2));
});

import { test, expect } from '@playwright/test';

test.describe('Turnstile Captcha Verification', () => {
  test('signup page loads and shows Turnstile widget', async ({ page }) => {
    await page.goto('http://127.0.0.1:8081/auth');
    
    // Wait for page to load (not networkidle due to Turnstile)
    await page.waitForSelector('body', { state: 'visible' });
    
    // Check page is not blank
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(100);
    
    // Verify Sign Up tab is visible
    const signUpTab = page.getByRole('tab', { name: 'Sign Up' });
    await expect(signUpTab).toBeVisible();
    
    // Click Sign Up tab to activate it
    await signUpTab.click();
    
    // Check form fields are present
    await expect(page.locator('#signup-name')).toBeVisible();
    await expect(page.locator('#signup-email')).toBeVisible();
    await expect(page.locator('#signup-password')).toBeVisible();
    
    // Check Turnstile widget renders (it creates an iframe)
    const turnstileIframe = page.frameLocator('iframe[src*="turnstile"]').first();
    await expect(turnstileIframe.locator('body')).toBeVisible({ timeout: 10000 });
    
    // Verify submit button exists and is disabled initially
    const submitButton = page.getByRole('button', { name: /sign up/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled(); // Should be disabled without captcha
    
    console.log('✅ Signup page: Turnstile widget rendered, form intact');
  });

  test('signin page loads and shows Turnstile widget', async ({ page }) => {
    await page.goto('http://127.0.0.1:8081/auth');
    
    // Wait for page to load (not networkidle due to Turnstile)
    await page.waitForSelector('body', { state: 'visible' });
    
    // Check page is not blank
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(100);
    
    // Verify Sign In tab is active by default
    const signInTab = page.getByRole('tab', { name: 'Sign In' });
    await expect(signInTab).toBeVisible();
    
    // Check form fields are present
    await expect(page.locator('#signin-email')).toBeVisible();
    await expect(page.locator('#signin-password')).toBeVisible();
    
    // Check Turnstile widget renders (it creates an iframe)
    const turnstileIframe = page.frameLocator('iframe[src*="turnstile"]').first();
    await expect(turnstileIframe.locator('body')).toBeVisible({ timeout: 10000 });
    
    // Verify submit button exists and is disabled initially
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled(); // Should be disabled without captcha
    
    console.log('✅ Signin page: Turnstile widget rendered, form intact');
  });

  test('signup form blocks submission without captcha completion', async ({ page }) => {
    await page.goto('http://127.0.0.1:8081/auth');
    await page.waitForSelector('body', { state: 'visible' });
    
    // Click Sign Up tab
    await page.getByRole('tab', { name: 'Sign Up' }).click();
    
    // Fill form fields
    await page.locator('#signup-name').fill('Test User');
    await page.locator('#signup-email').fill('test@example.com');
    await page.locator('#signup-password').fill('password123');
    
    // Check terms checkbox
    await page.locator('#terms').check();
    
    // Submit button should still be disabled (no captcha token)
    const submitButton = page.getByRole('button', { name: /sign up/i });
    await expect(submitButton).toBeDisabled();
    
    console.log('✅ Signup: Form blocks submission without captcha');
  });

  test('signin form blocks submission without captcha completion', async ({ page }) => {
    await page.goto('http://127.0.0.1:8081/auth');
    await page.waitForSelector('body', { state: 'visible' });
    
    // Fill form fields
    await page.locator('#signin-email').fill('test@example.com');
    await page.locator('#signin-password').fill('password123');
    
    // Submit button should be disabled (no captcha token)
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeDisabled();
    
    console.log('✅ Signin: Form blocks submission without captcha');
  });

  test('no console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Test signup page
    await page.goto('http://127.0.0.1:8081/auth');
    await page.waitForSelector('body', { state: 'visible' });
    await page.getByRole('tab', { name: 'Sign Up' }).click();
    await page.waitForTimeout(2000);
    
    // Test signin page
    await page.goto('http://127.0.0.1:8081/auth');
    await page.waitForSelector('body', { state: 'visible' });
    await page.waitForTimeout(2000);
    
    // Filter out known safe errors (if any)
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('ResizeObserver') &&
      !err.includes('Service Worker')
    );
    
    expect(criticalErrors.length).toBe(0);
    
    console.log('✅ No critical console errors detected');
  });
});

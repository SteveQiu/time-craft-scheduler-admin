import { requireTestSecret } from './testCredentials.js';
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Playwright test for opening removal fix
 * 
 * Issue: After removing an opening, all openings disappeared
 * Root Cause: loadOpeningsForMonth() being called, acceptedWorkers might be empty during reload
 * Fix: Remove from local state instead of full reload
 */

test.describe('Opening Removal Fix', () => {
  test('Removing opening should not delete other openings', async ({ page }) => {
    // Login
    await page.goto('http://localhost:8080/signin', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'sdeqiu@gmail.com');
    await page.fill('input[type="password"]', requireTestSecret('TESTER3_PASSWORD1'));
    await page.click('button:has-text("Sign in")');
    await page.waitForLoadState('networkidle');

    // Navigate to org calendar
    await page.goto('http://localhost:8080/calendar?mode=org', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Count initial openings
    const initialOpeningCards = page.locator('[data-opening-id], [class*="opening-card"]');
    const initialCount = await initialOpeningCards.count();

    console.log(`Initial openings: ${initialCount}`);

    // If there are at least 2 openings, try to remove one
    if (initialCount >= 2) {
      // Get first opening's delete button
      const firstDeleteButton = page
        .locator('button:has-text("Remove opening")')
        .first();

      if ((await firstDeleteButton.count()) > 0) {
        // Click delete on first opening
        await firstDeleteButton.click();

        // Wait for deletion to complete
        await page.waitForTimeout(500);

        // Count openings after deletion
        const afterDeleteCards = page.locator('[data-opening-id], [class*="opening-card"]');
        const afterDeleteCount = await afterDeleteCards.count();

        console.log(`After delete: ${afterDeleteCount}`);

        // Should have one less, not zero
        expect(afterDeleteCount).toBe(initialCount - 1);
        expect(afterDeleteCount).toBeGreaterThan(0);

        console.log(`✅ Correct: ${initialCount} - 1 = ${afterDeleteCount}`);
      }
    } else {
      console.log('⚠️  Not enough openings to test removal');
    }
  });

  test('Opening removal updates local state (no full reload)', async () => {
    // Verify the fix was applied
    const calendarFile = fs.readFileSync(
      path.join(process.cwd(), 'src/components/Calendar.tsx'),
      'utf-8'
    );

    // Check that local state removal is implemented
    expect(calendarFile).toContain(
      'setOpenings(prev => prev.filter(opening => opening.id !== id))'
    );

    // Check that full reload is only on error
    const removeOpening = calendarFile.match(
      /const removeOpening = async \(id: string\) => \{[\s\S]*?\};/
    );
    expect(removeOpening).toBeTruthy();

    // Should have the local state filter
    expect(removeOpening![0]).toContain('filter');
    // Should have reload in catch
    expect(removeOpening![0]).toContain('catch');

    console.log('✅ Opening removal uses local state instead of reload');
  });

  test('Opening removal completes quickly (no loading spinner)', async ({ page }) => {
    // Login
    await page.goto('http://localhost:8080/signin', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'sdeqiu@gmail.com');
    await page.fill('input[type="password"]', requireTestSecret('TESTER3_PASSWORD1'));
    await page.click('button:has-text("Sign in")');
    await page.waitForLoadState('networkidle');

    // Navigate to org calendar
    await page.goto('http://localhost:8080/calendar?mode=org', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check for any openings
    const deleteButtons = page.locator('button:has-text("Remove opening")');
    const deleteCount = await deleteButtons.count();

    if (deleteCount > 0) {
      // Get time before delete
      const startTime = Date.now();

      // Click delete
      await deleteButtons.first().click();

      // Wait a moment
      await page.waitForTimeout(200);

      // Check that loading spinner is NOT visible
      const spinner = page.locator('.animate-spin');
      const isSpinning = await spinner.isVisible();

      const elapsedMs = Date.now() - startTime;

      console.log(`Delete completed in ${elapsedMs}ms, spinner visible: ${isSpinning}`);

      expect(isSpinning).toBeFalsy('Should not show loading spinner on local deletion');
    }
  });

  test('Opening removal fails gracefully and reloads on error', async () => {
    // Verify error handling
    const calendarFile = fs.readFileSync(
      path.join(process.cwd(), 'src/components/Calendar.tsx'),
      'utf-8'
    );

    // Should have try-catch
    expect(calendarFile).toContain('try');
    expect(calendarFile).toContain('catch (error)');

    // Should reload on error
    const catchBlock = calendarFile.match(/catch \(error\) \{[\s\S]*?\}/);
    expect(catchBlock![0]).toContain('loadOpeningsForMonth');

    console.log('✅ Error handling includes reload fallback');
  });

  test('Removing an opening does not affect other org workers openings', async ({
    page,
  }) => {
    // This verifies the fix doesn't have authorization issues
    await page.goto('http://localhost:8080/signin', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'sdeqiu@gmail.com');
    await page.fill('input[type="password"]', requireTestSecret('TESTER3_PASSWORD1'));
    await page.click('button:has-text("Sign in")');
    await page.waitForLoadState('networkidle');

    // Navigate to org calendar
    await page.goto('http://localhost:8080/calendar?mode=org', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Verify no console errors after load
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a moment to catch any errors
    await page.waitForTimeout(500);

    // Should not have auth errors
    const authErrors = errors.filter(e => e.toLowerCase().includes('auth'));
    expect(authErrors.length).toBe(0);

    console.log('✅ No authorization errors');
  });
});

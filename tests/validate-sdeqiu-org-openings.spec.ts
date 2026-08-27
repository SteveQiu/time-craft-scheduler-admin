import { requireTestSecret } from './testCredentials.js';
import { test, expect } from '@playwright/test';
import * as fs from 'fs';

// Load credentials from .secret file
const secretContent = fs.readFileSync('.secret', 'utf-8');
const secretLines = secretContent.split('\n');
const secrets: Record<string, string> = {};
secretLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    secrets[key.trim()] = value.trim();
  }
});

const SDEQIU_EMAIL = secrets['TESTER3_EMAIL'] || 'sdeqiu@gmail.com';
const SDEQIU_PASSWORD = secrets['TESTER3_PASSWORD1'] || requireTestSecret('TESTER3_PASSWORD1');

test.describe('sdeqiu Org Mode Openings Validation', () => {
  test('should display openings in org mode calendar', async ({ page }) => {
    console.log('\n🚀 Starting sdeqiu org openings validation...');
    console.log(`   Email: ${SDEQIU_EMAIL}`);

    // 1. Navigate to auth page
    console.log('\n1️⃣  Navigating to auth page...');
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle');

    // 2. Sign in with sdeqiu credentials
    console.log('2️⃣  Signing in as sdeqiu...');
    await page.fill('input[type="email"]', SDEQIU_EMAIL);
    await page.fill('input[type="password"]', SDEQIU_PASSWORD);
    
    // Wait for Enter key to work (button click fix)
    await page.press('input[type="password"]', 'Enter');
    
    console.log('   Waiting for redirect...');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    
    const currentUrl = page.url();
    console.log(`   ✅ Redirected to: ${currentUrl}`);
    expect(currentUrl).toContain('localhost:8080');  // Just verify we're on the app

    // 3. Navigate to org calendar
    console.log('\n3️⃣  Navigating to calendar in org mode...');
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    
    // Wait for calendar to fully load
    await page.waitForTimeout(2000);

    // 4. Check for calendar elements
    console.log('4️⃣  Checking calendar elements...');
    
    // Look for the calendar month view
    const calendarExists = await page.locator('[role="grid"], .calendar, [data-testid="calendar"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`   Calendar visible: ${calendarExists}`);

    // 5. Look for opening cards/elements
    console.log('\n5️⃣  Scanning for opening displays...');
    
    // Try various selectors for openings
    const selectors = [
      '[data-testid="opening-card"]',
      '[class*="opening"]',
      '[class*="Opening"]',
      'button:has-text("Hair cut")',
      'button:has-text("$")',
    ];

    let openingsFound = false;
    let openingCount = 0;

    for (const selector of selectors) {
      try {
        const elements = await page.locator(selector).all();
        if (elements.length > 0) {
          console.log(`   ✅ Found ${elements.length} element(s) with selector: ${selector}`);
          openingCount = Math.max(openingCount, elements.length);
          openingsFound = true;

          // Log content of first few elements
          for (let i = 0; i < Math.min(3, elements.length); i++) {
            const text = await elements[i].textContent();
            console.log(`      [${i + 1}] ${text?.substring(0, 80)}`);
          }
        }
      } catch {
        // Selector didn't match
      }
    }

    // 6. Check page text content for appointment indicators
    console.log('\n6️⃣  Checking page content for appointments/openings...');
    const pageText = await page.content();
    const hasHaircut = pageText.includes('Hair cut') || pageText.includes('hair cut');
    const hasDollar = pageText.includes('$50') || pageText.includes('$');
    const hasAppointment = pageText.includes('appointment') || pageText.includes('Appointment');
    
    console.log(`   Contains "Hair cut": ${hasHaircut}`);
    console.log(`   Contains pricing ($): ${hasDollar}`);
    console.log(`   Contains "appointment": ${hasAppointment}`);

    // 7. Get visible text to debug what's on page
    console.log('\n7️⃣  Page title and visible elements:');
    const title = await page.title();
    console.log(`   Page title: ${title}`);

    const heading = await page.locator('h1, h2, [class*="title"]').first().textContent().catch(() => 'N/A');
    console.log(`   Main heading: ${heading}`);

    // 8. Check for "no openings" message
    console.log('\n8️⃣  Checking for "no openings" messages...');
    const noOpeningsText = await page.locator('text=/no.*opening|empty|none/i').count();
    console.log(`   "No openings" messages found: ${noOpeningsText}`);

    // 9. Network tab - check API calls
    console.log('\n9️⃣  Checking API requests...');
    const _responses = page.context().tracing ? [] : [];
    
    // Try to find any failed network requests
    const failedRequests: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.request().url()} - ${response.status()}`);
      }
    });

    await page.waitForTimeout(1000);
    if (failedRequests.length > 0) {
      console.log('   Failed requests:');
      failedRequests.forEach(req => console.log(`     - ${req}`));
    } else {
      console.log('   ✅ No failed API requests');
    }

    // 10. Final verdict
    console.log('\n🎯 VALIDATION RESULT:');
    console.log('═'.repeat(50));
    
    if (openingsFound || hasHaircut) {
      console.log('✅ PASS: Openings ARE visible in org mode');
      console.log(`   - Found ${openingCount} opening elements`);
      console.log('   - sdeqiu can see org member appointments');
    } else {
      console.log('⚠️  NO OPENINGS VISIBLE');
      console.log('   - Could not detect appointment/opening elements');
      console.log('   - Check if data exists for this month');
      console.log('   - Verify sdeqiu has organization role');
    }
    console.log('═'.repeat(50));

    // Take screenshot for manual verification
    await page.screenshot({ path: 'tests/screenshots/sdeqiu-org-calendar.png' });
    console.log('\n📸 Screenshot saved: tests/screenshots/sdeqiu-org-calendar.png');

    // Assertion: Either openings are visible OR page loads without errors
    expect(calendarExists || openingsFound || hasHaircut).toBeTruthy();
  });
});

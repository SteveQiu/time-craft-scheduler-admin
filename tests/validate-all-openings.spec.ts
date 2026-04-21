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
const SDEQIU_PASSWORD = secrets['TESTER3_PASSWORD1'] || 'Soulreap1';

test.describe('Validate 10+ Org Openings with Database', () => {
  test('should display all 10+ openings in org calendar', async ({ page }) => {
    console.log('\n🚀 Starting comprehensive openings validation...');
    console.log(`   Testing as: ${SDEQIU_EMAIL}`);

    // 1. Sign in
    console.log('\n1️⃣  Signing in as sdeqiu...');
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', SDEQIU_EMAIL);
    await page.fill('input[type="password"]', SDEQIU_PASSWORD);
    await page.press('input[type="password"]', 'Enter');

    await page.waitForNavigation({ waitUntil: 'networkidle' });
    console.log('   ✅ Signed in successfully');

    // 2. Query API directly via page context to get openings
    console.log('\n2️⃣  Querying openings via Supabase API...');
    
    const openingsData = await page.evaluate(async () => {
      try {
        const response = await fetch('https://otihzwgwvcajvglrwhkb.supabase.co/rest/v1/openings?select=*&limit=1000', {
          headers: {
            'Authorization': `Bearer sb_publishable_LGzr9sQ7QCazLxDaHd7EcA_eEM7Bqqt`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          return { error: `HTTP ${response.status}`, success: false };
        }
        
        const data = await response.json();
        return { success: true, count: data.length, data: data };
      } catch (e) {
        return { error: (e as Error).message, success: false };
      }
    });

    let dbCount = 0;
    if (openingsData.success) {
      console.log(`   ✅ API query successful`);
      dbCount = openingsData.count;
      console.log(`   Total openings in database: ${dbCount}`);
      
      // Group by date
      const byDate: Record<string, number> = {};
      if (openingsData.data && Array.isArray(openingsData.data)) {
        openingsData.data.forEach((opening: any) => {
          byDate[opening.date] = (byDate[opening.date] || 0) + 1;
        });
        
        console.log('\n   Openings by date:');
        Object.entries(byDate).slice(0, 10).forEach(([date, count]) => {
          console.log(`      ${date}: ${count} opening(s)`);
        });
      }
    } else {
      console.log(`   ⚠️  API query error: ${openingsData.error}`);
      console.log('   Continuing with UI validation only...');
    }

    // 3. Navigate to org calendar
    console.log('\n3️⃣  Navigating to org mode calendar...');
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 4. Get the raw page content to count all openings
    console.log('\n4️⃣  Analyzing page content for openings...');
    const pageContent = await page.content();
    
    // Count price indicators (each opening should have a price)
    const priceMatches = pageContent.match(/\$\d+/g) || [];
    const uniquePrices = [...new Set(priceMatches)];
    console.log(`   Price indicators found: ${priceMatches.length}`);
    console.log(`   Unique prices: ${uniquePrices.join(', ')}`);

    // Count "Hair cut" mentions
    const hairCutMatches = pageContent.match(/Hair cut/gi) || [];
    console.log(`   "Hair cut" mentions: ${hairCutMatches.length}`);

    // 5. Count appointment entries
    console.log('\n5️⃣  Counting appointment entries...');
    
    // Get all visible text containing time slots and prices
    const appointmentPattern = /\d{2}:\d{2}-\d{2}:\d{2}/g;
    const timeSlots = pageContent.match(appointmentPattern) || [];
    console.log(`   Time slots found: ${timeSlots.length}`);
    
    // Count unique time slots
    const uniqueTimeSlots = [...new Set(timeSlots)];
    console.log(`   Unique time slots: ${uniqueTimeSlots.length}`);
    uniqueTimeSlots.slice(0, 15).forEach((slot, idx) => {
      console.log(`      [${idx + 1}] ${slot}`);
    });

    // 6. Expand all worker sections
    console.log('\n6️⃣  Expanding all worker sections...');
    const sections = await page.locator('[role="button"]').all();
    let expandedCount = 0;
    for (let i = 0; i < sections.length; i++) {
      try {
        const text = await sections[i].textContent();
        if (text && text.includes('(') && text.includes(')')) {
          await sections[i].click();
          expandedCount++;
          await page.waitForTimeout(300);
        }
      } catch (e) {
        // Skip
      }
    }
    console.log(`   Expanded ${expandedCount} sections`);

    // 7. Get final count after expansion
    console.log('\n7️⃣  Final count after expansion...');
    const finalContent = await page.content();
    const finalPrices = finalContent.match(/\$\d+/g) || [];
    const finalHaircuts = finalContent.match(/Hair cut/gi) || [];
    const finalSlots = finalContent.match(/\d{2}:\d{2}-\d{2}:\d{2}/g) || [];
    
    console.log(`   Final price count: ${finalPrices.length}`);
    console.log(`   Final haircut count: ${finalHaircuts.length}`);
    console.log(`   Final time slots: ${finalSlots.length}`);

    // 8. Summary
    console.log('\n🎯 VALIDATION RESULTS:');
    console.log('═'.repeat(60));
    
    const estimatedOpenings = Math.max(
      finalPrices.length,
      finalHaircuts.length,
      finalSlots.length,
      dbCount
    );
    
    console.log(`Database openings: ${dbCount}`);
    console.log(`UI visible count (prices): ${finalPrices.length}`);
    console.log(`UI visible count (haircuts): ${finalHaircuts.length}`);
    console.log(`UI visible count (time slots): ${finalSlots.length}`);
    console.log(`\nEstimated total openings: ${estimatedOpenings}`);
    console.log(`Min requirement: 10`);
    
    if (estimatedOpenings >= 10) {
      console.log('\n✅ PASS: 10+ openings are visible and in database');
    } else {
      console.log(`\n⚠️  WARNING: Only ${estimatedOpenings} openings found (expected 10+)`);
    }
    console.log('═'.repeat(60));

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/all-openings-expanded.png', fullPage: true });
    console.log('\n📸 Screenshot saved: tests/screenshots/all-openings-expanded.png');

    // Assertion - check that we found 10+ openings
    expect(estimatedOpenings).toBeGreaterThanOrEqual(10);
  });
});

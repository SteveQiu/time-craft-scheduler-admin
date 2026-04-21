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

test.describe('Count All Openings on Calendar', () => {
  test('should count all 10+ openings visible on calendar dates', async ({ page }) => {
    console.log('\n🚀 Counting all openings on calendar...');

    // 1. Sign in
    console.log('\n1️⃣  Signing in as sdeqiu...');
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', SDEQIU_EMAIL);
    await page.fill('input[type="password"]', SDEQIU_PASSWORD);
    await page.press('input[type="password"]', 'Enter');

    await page.waitForNavigation({ waitUntil: 'networkidle' });
    console.log('   ✅ Signed in');

    // 2. Navigate to org calendar
    console.log('\n2️⃣  Going to org calendar...');
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 3. Get raw page content and count opening indicators
    console.log('\n3️⃣  Counting opening indicators on calendar...');
    
    const pageContent = await page.content();
    
    // The calendar shows numbers on each date cell for opening count
    // Look for pattern like: ">1<" or ">2<" (numbers in badges)
    // Also count by looking at all the visible small numbers
    
    const counts = await page.evaluate(() => {
      // Get the full calendar area text
      const calendarArea = document.querySelector('[role="presentation"]') || document.body;
      const allText = calendarArea.innerText;
      
      // Split by lines and look for dates followed by numbers
      const lines = allText.split('\n');
      const openingsByDate: Record<string, number> = {};
      let totalOpenings = 0;
      
      // Look for pattern: number followed by another number on same or next line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
        
        // Match calendar date (1-31) followed by opening count
        if (/^\d{1,2}$/.test(line) && /^\d+$/.test(nextLine)) {
          const date = parseInt(line);
          const openCount = parseInt(nextLine);
          
          // Only count if it makes sense (1-31 for date, 1+ for opening count)
          if (date >= 1 && date <= 31 && openCount >= 1) {
            openingsByDate[date.toString()] = openCount;
            totalOpenings += openCount;
          }
        }
      }
      
      return { openingsByDate, totalOpenings };
    });

    console.log(`\n   Openings by date:`);
    Object.entries(counts.openingsByDate).forEach(([date, count]) => {
      console.log(`      April ${date}: ${count} opening(s)`);
    });

    console.log(`\n   📊 Total openings: ${counts.totalOpenings}`);

    // 4. Alternative count - check sidebar for all workers
    console.log('\n4️⃣  Checking sidebar workers...');
    const workerCounts = await page.evaluate(() => {
      const text = document.body.innerText;
      // Look for pattern like "Steve (2)" 
      const matches = text.match(/\w+\s+\(\d+\)/g) || [];
      return matches;
    });

    console.log(`   Found worker sections: ${workerCounts.length}`);
    workerCounts.forEach((w) => {
      console.log(`      ${w}`);
    });

    // 5. Take screenshot
    console.log('\n5️⃣  Taking screenshot...');
    await page.screenshot({ path: 'tests/screenshots/count-openings-result.png', fullPage: true });

    // 6. Results
    console.log('\n🎯 FINAL RESULTS:');
    console.log('═'.repeat(60));
    console.log(`Total openings detected: ${counts.totalOpenings}`);
    console.log(`Dates with openings: ${Object.keys(counts.openingsByDate).length}`);
    console.log(`Worker sections found: ${workerCounts.length}`);
    console.log(`\nStatus: ${counts.totalOpenings >= 10 ? '✅ PASS - 10+ openings visible' : '⚠️  Only ' + counts.totalOpenings + ' openings found'}`);
    console.log('═'.repeat(60));

    expect(counts.totalOpenings).toBeGreaterThanOrEqual(10);
  });
});

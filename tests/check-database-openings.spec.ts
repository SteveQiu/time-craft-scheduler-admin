import { test } from '@playwright/test';
import * as fs from 'fs';

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

test.describe('Verify Openings in Database', () => {
  test('check if created openings exist in database after refresh', async ({ page }) => {
    console.log('\n🔍 Checking database for created openings\n');

    // Sign in
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', SDEQIU_EMAIL);
    await page.fill('input[type="password"]', SDEQIU_PASSWORD);
    await page.press('input[type="password"]', 'Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Check database directly via page.evaluate
    console.log('1️⃣  Querying openings table via Supabase API...');
    
    const dbOpenings = await page.evaluate(async () => {
      try {
        const response = await fetch('https://otihzwgwvcajvglrwhkb.supabase.co/rest/v1/openings?select=*&date=gte.2026-05-01&date=lte.2026-05-31&order=date.asc,start_time.asc', {
          headers: {
            'apikey': 'sb_publishable_LGzr9sQ7QCazLxDaHd7EcA_eEM7Bqqt',
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          return { error: `HTTP ${response.status}`, count: 0 };
        }
        
        const data = await response.json();
        return { success: true, count: data.length, data: data };
      } catch (e) {
        return { error: (e as Error).message, count: 0 };
      }
    });

    console.log(`   Openings in May 2026: ${dbOpenings.count}`);
    if (dbOpenings.data && Array.isArray(dbOpenings.data)) {
      dbOpenings.data.forEach((op: any, i: number) => {
        console.log(`   [${i + 1}] ${op.date} ${op.start_time}-${op.end_time} ${op.worker}`);
      });
    }

    // Now go to April calendar and check what it fetches
    console.log('\n2️⃣  Going to calendar April 2026...');
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const aprilOpenings = await page.evaluate(() => document.body.innerText);
    const aprilHaircuts = aprilOpenings.match(/Hair cut/gi)?.length || 0;
    console.log(`   Haircuts visible in April: ${aprilHaircuts}`);

    // Navigate to May
    console.log('\n3️⃣  Navigating to May...');
    await page.click('[title*="next"], button:has-text("→")').catch(() => {
      console.log('   Could not find next month button');
    });
    await page.waitForTimeout(1000);

    const mayOpenings = await page.evaluate(() => document.body.innerText);
    const mayHaircuts = mayOpenings.match(/Hair cut/gi)?.length || 0;
    console.log(`   Haircuts visible in May: ${mayHaircuts}`);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/may-calendar.png', fullPage: true });

    console.log('\n🎯 FINDINGS:');
    console.log('═'.repeat(60));
    console.log(`Database (May 2026): ${dbOpenings.count} openings`);
    console.log(`Calendar April: ${aprilHaircuts} haircuts`);
    console.log(`Calendar May: ${mayHaircuts} haircuts`);
    console.log('\nAnalysis:');
    if (dbOpenings.count > 0 && mayHaircuts === 0) {
      console.log('  Database HAS openings but calendar does NOT show them');
      console.log('  ROOT CAUSE: Calendar query filters by wrong month');
    } else if (dbOpenings.count === 0) {
      console.log('  Database HAS NO openings');
      console.log('  ROOT CAUSE: Creation failed silently, check form validation');
    } else {
      console.log('  Openings are in database AND visible on calendar');
    }
    console.log('═'.repeat(60));
  });
});

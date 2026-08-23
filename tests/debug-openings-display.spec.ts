import { test } from '@playwright/test';
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

test.describe('Debug Calendar Openings Display', () => {
  test('should display all created openings', async ({ page }) => {
    console.log('\n🚀 Debugging calendar openings display...');

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
    await page.waitForTimeout(3000);

    // 3. Get the full page text to see the structure
    console.log('\n3️⃣  Inspecting page structure...');
    const fullText = await page.evaluate(() => document.body.innerText);
    console.log('Full page text (first 2000 chars):');
    console.log(fullText.substring(0, 2000));

    // 4. Check what month we're viewing
    console.log('\n4️⃣  Current calendar view:');
    const monthIndicator = await page.locator('h2, h1').first().textContent();
    console.log(`   Month showing: ${monthIndicator}`);

    // 5. Look for all Worker sections (with counts)
    console.log('\n5️⃣  Scanning for worker sections...');
    const allText = await page.content();
    
    // Find patterns like "Steve (2)" or "Worker Name (X)"
    const workerPattern = /([A-Za-z\s]+)\s+\((\d+)\)/g;
    let match;
    let totalFromPattern = 0;
    const workers: Array<{name: string, count: number}> = [];
    
    while ((match = workerPattern.exec(allText)) !== null) {
      const name = match[1].trim();
      const count = parseInt(match[2]);
      if (!workers.find(w => w.name === name)) {
        workers.push({name, count});
        totalFromPattern += count;
      }
    }

    console.log(`   Found ${workers.length} workers:`);
    workers.forEach(w => {
      console.log(`      - ${w.name}: ${w.count} opening(s)`);
    });
    console.log(`   Total openings from pattern: ${totalFromPattern}`);

    // 6. Click on first worker to expand
    console.log('\n6️⃣  Clicking first expandable button...');
    const buttons = await page.locator('button').all();
    let clicked = false;
    
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.includes('(') && text.includes(')') && !text.includes('Today')) {
        console.log(`   Clicking: ${text.substring(0, 50)}`);
        await btn.click();
        clicked = true;
        await page.waitForTimeout(500);
        break;
      }
    }

    if (!clicked) {
      console.log('   ⚠️  No expandable buttons found');
    }

    // 7. Take screenshot to see current state
    console.log('\n7️⃣  Taking screenshot...');
    await page.screenshot({ path: 'tests/screenshots/debug-calendar.png', fullPage: true });

    // 8. Get all visible appointment text
    console.log('\n8️⃣  Extracting visible appointments...');
    const visibleText = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, div, span');
      const appointments: string[] = [];
      
      elements.forEach(el => {
        const text = el.textContent;
        if (text && text.includes('Hair cut') && text.length < 200) {
          appointments.push(text.trim());
        }
      });
      
      return appointments;
    });

    console.log(`   Found ${visibleText.length} visible appointment texts`);
    visibleText.slice(0, 15).forEach((text, i) => {
      console.log(`      [${i + 1}] ${text.substring(0, 80)}`);
    });

    // 9. Count all $ signs (one per opening typically)
    console.log('\n9️⃣  Counting price indicators...');
    const content = await page.content();
    const prices = content.match(/\$\d+/g) || [];
    console.log(`   Total $ indicators: ${prices.length}`);

    console.log('\n📊 SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`Workers found: ${workers.length}`);
    console.log(`Openings from worker labels: ${totalFromPattern}`);
    console.log(`Visible appointment texts: ${visibleText.length}`);
    console.log(`Price indicators ($): ${prices.length}`);
    console.log(`\nEstimated openings: ${Math.max(totalFromPattern, prices.length, visibleText.length)}`);
    console.log('═'.repeat(60));
  });
});

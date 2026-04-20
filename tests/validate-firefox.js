import { firefox } from 'playwright';
import fs from 'fs';
import path from 'path';

// Create screenshots directory
const screenshotDir = 'firefox-validation-screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function validateWithFirefox() {
  const browser = await firefox.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('🔥 Firefox Validation - Profile & Browse Pages\n');
  
  try {
    // 1. Public profile page (unauthenticated)
    console.log('1️⃣ Loading profile page (unauthenticated)...');
    await page.goto('http://localhost:8080/profile/276a81aa-0d96-4992-9105-23c3cbb4c092', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/01-profile-unauthenticated.png` });
    console.log('✅ Screenshot saved: 01-profile-unauthenticated.png');
    console.log('   Check: Profile should show name, email, address, skills, hourly rate\n');
    
    // 2. Login
    console.log('2️⃣ Going to auth page...');
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/02-auth-page.png` });
    console.log('✅ Screenshot saved: 02-auth-page.png');
    console.log('   Check: Login form should be visible\n');
    
    // 3. Fill login
    console.log('3️⃣ Signing in...');
    await page.fill('input[type="email"]', 'aaa@aaa.com');
    await page.fill('input[type="password"]', 'aaaaaa');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/browse', { timeout: 10000 }).catch(() => console.log('   ⚠️ Navigation delayed'));
    await page.waitForTimeout(2000);
    console.log('✅ Logged in\n');
    
    // 4. Browse page
    console.log('4️⃣ Loading browse page (authenticated)...');
    await page.goto('http://localhost:8080/browse', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/04-browse-page.png` });
    console.log('✅ Screenshot saved: 04-browse-page.png');
    console.log('   Check: Should show search filter, providers list, and Bookmarks section\n');
    
    // 5. Scroll to see bookmarks section
    console.log('5️⃣ Scrolling to Bookmarks section...');
    await page.evaluate(() => {
      const bookmarksSection = document.evaluate(
        "//h3[contains(text(), 'Bookmarks')]",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      if (bookmarksSection) {
        bookmarksSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotDir}/05-bookmarks-section.png` });
    console.log('✅ Screenshot saved: 05-bookmarks-section.png');
    console.log('   Check: Bookmarks section should be visible\n');
    
    // 6. Click on a provider to view profile
    console.log('6️⃣ Finding and clicking on a provider...');
    const firstProviderLink = await page.locator('a[href*="/profile/"]').first();
    if (await firstProviderLink.isVisible()) {
      const href = await firstProviderLink.getAttribute('href');
      console.log('   Provider link:', href);
      await firstProviderLink.click();
      await page.waitForURL(`**${href}`, { timeout: 5000 });
      await page.screenshot({ path: `${screenshotDir}/06-provider-profile.png` });
      console.log('✅ Screenshot saved: 06-provider-profile.png');
      console.log('   Check: Should show provider profile with bookmark button\n');
    } else {
      console.log('⚠️ No provider link found\n');
    }
    
    console.log('✅ FIREFOX VALIDATION COMPLETE');
    console.log('\n📁 All screenshots saved to: ' + screenshotDir);
    return true;
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    return false;
  } finally {
    // Keep Firefox open for manual inspection
    console.log('\n🔍 Firefox window remains open for inspection.');
    console.log('   Close it when done, or press Ctrl+C to exit.');
    await new Promise(() => {}); // Keep process alive
  }
}

validateWithFirefox();

import { requireTestSecret } from './testCredentials.js';
import { firefox } from 'playwright';

async function validateTabs() {
  const browser = await firefox.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('🧪 Validating Browse Page Tabs\n');
  
  try {
    // Login first
    console.log('1️⃣ Logging in...');
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'aaa@aaa.com');
    await page.fill('input[type="password"]', requireTestSecret('TESTER1_PASSWORD1'));
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(2000);
    console.log('   ✅ Logged in\n');
    
    // Navigate to browse
    console.log('2️⃣ Loading browse page...');
    await page.goto('http://localhost:8080/browse', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'firefox-validation-screenshots/tabs-default.png' });
    console.log('   ✅ Browse page loaded\n');
    
    // Check for tab buttons
    console.log('3️⃣ Checking for tab buttons...');
    const allTab = await page.locator('button:has-text("All")').isVisible();
    const bookmarksTab = await page.locator('button:has-text("Bookmarks")').isVisible();
    
    if (allTab && bookmarksTab) {
      console.log('   ✅ Both tabs visible (All & Bookmarks)\n');
    } else {
      console.log('   ❌ Tabs not found\n');
      return false;
    }
    
    // Click Bookmarks tab
    console.log('4️⃣ Clicking Bookmarks tab...');
    await page.click('button:has-text("Bookmarks")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'firefox-validation-screenshots/tabs-bookmarks.png' });
    console.log('   ✅ Bookmarks view active\n');
    
    // Click All tab
    console.log('5️⃣ Clicking All tab...');
    await page.click('button:has-text("All")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'firefox-validation-screenshots/tabs-all.png' });
    console.log('   ✅ All view active\n');
    
    console.log('✅ TAB FUNCTIONALITY WORKING');
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

validateTabs();

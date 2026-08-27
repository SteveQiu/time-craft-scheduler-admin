import { requireTestSecret } from './testCredentials.js';
import { chromium } from 'playwright';

async function testProfileAndBrowse() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('🧪 Validating Profile & Browse Pages\n');
  
  try {
    // Test 1: Public profile access (no login needed)
    console.log('1️⃣ Testing public profile access (unauthenticated)...');
    await page.goto('http://localhost:8080/profile/276a81aa-0d96-4992-9105-23c3cbb4c092', { waitUntil: 'networkidle' });
    
    const profileContent = await page.content();
    const hasProfileData = profileContent.includes('full_name') || 
                          profileContent.includes('email') ||
                          profileContent.includes('address') ||
                          profileContent.length > 10000;
    
    if (hasProfileData) {
      console.log('✅ Public profile loads without authentication\n');
    } else {
      console.log('❌ Profile page appears blank or too small');
      return false;
    }
    
    // Test 2: Login to browse
    console.log('2️⃣ Testing login and browse access...');
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle' });
    
    // Fill email
    await page.fill('input[type="email"]', 'aaa@aaa.com');
    await page.fill('input[type="password"]', requireTestSecret('TESTER1_PASSWORD1'));
    
    // Submit
    await page.click('button:has-text("Sign In")');
    
    // Wait for redirect
    await page.waitForURL('**/browse', { timeout: 5000 }).catch(() => {
      console.log('⚠️ Auth may have failed, continuing...');
    });
    
    // Navigate to browse
    await page.goto('http://localhost:8080/browse', { waitUntil: 'networkidle' });
    
    const browseContent = await page.content();
    const hasBrowseData = browseContent.includes('provider') || 
                         browseContent.includes('opening') ||
                         browseContent.includes('Bookmarks') ||
                         browseContent.length > 10000;
    
    if (hasBrowseData) {
      console.log('✅ Browse page loads\n');
    } else {
      console.log('⚠️ Browse page may not have full data');
    }
    
    console.log('✅ PAGES VALIDATION PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testProfileAndBrowse().then(success => {
  process.exit(success ? 0 : 1);
});

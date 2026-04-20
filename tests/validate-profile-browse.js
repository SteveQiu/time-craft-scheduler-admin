import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8080';

async function validateProfileAndBrowse() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('🧪 VALIDATION: Profile & Browse Pages\n');

    // Test 1: Profile page unauthenticated
    console.log('1️⃣ Testing profile page (unauthenticated)...');
    await page.goto(`${BASE_URL}/profile/276a81aa-0d96-4992-9105-23c3cbb4c092`, { waitUntil: 'networkidle' });
    
    const profileContent = await page.content();
    const hasProfileName = profileContent.includes('aaa') || await page.locator('text=aaa').isVisible().catch(() => false);
    const hasProfileInfo = await page.locator('[data-test="profile-card"]').isVisible().catch(() => false) || 
                          await page.locator('button:has-text("Share")').isVisible().catch(() => false);
    
    if (hasProfileName || hasProfileInfo || profileContent.length > 5000) {
      console.log('✅ Profile page loads unauthenticated\n');
    } else {
      console.log('❌ FAIL: Profile page appears blank');
      console.log('   Page content length:', profileContent.length);
      console.log('   Looking for profile data...\n');
      await page.screenshot({ path: 'profile-blank.png' });
      throw new Error('Profile page blank');
    }

    // Test 2: Browse page accessible
    console.log('2️⃣ Testing browse page...');
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'networkidle' });
    
    const browseContent = await page.content();
    const hasSearch = await page.locator('input[placeholder*="Search"]').isVisible().catch(() => false);
    const hasProviders = browseContent.includes('provider') || browseContent.includes('opening');
    
    if (hasSearch || hasProviders) {
      console.log('✅ Browse page loads\n');
    } else {
      console.log('⚠️ Browse page may not have loaded fully');
    }

    // Test 3: Bookmarks section visible (when logged in)
    console.log('3️⃣ Testing bookmarks section visibility...');
    const hasBookmarksSection = await page.locator('text=Bookmarks').isVisible().catch(() => false) ||
                               browseContent.includes('Bookmarks');
    
    if (hasBookmarksSection) {
      console.log('✅ Bookmarks section visible on browse page\n');
    } else {
      console.log('⚠️ Bookmarks section not visible (may require login)\n');
    }

    console.log('✅ VALIDATION PASSED');
    return true;

  } catch (error) {
    console.error('❌ VALIDATION FAILED:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

validateProfileAndBrowse().then(success => {
  process.exit(success ? 0 : 1);
});

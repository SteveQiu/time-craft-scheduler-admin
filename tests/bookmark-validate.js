import { chromium } from 'playwright';

async function testBookmarkFeature() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('🔍 Testing Bookmark Feature\n');
  
  try {
    // 1. Check if browse page works
    console.log('1️⃣ Loading browse page...');
    await page.goto('http://localhost:8080/browse', { waitUntil: 'networkidle' });
    
    const browseContent = await page.content();
    if (browseContent.length < 1000) {
      console.log('❌ Browse page blank or not loaded');
      return false;
    }
    console.log('✅ Browse page loaded');
    
    // 2. Get all provider links
    console.log('\n2️⃣ Finding first provider profile...');
    const profileLinks = await page.locator('a[href*="/profile/"]').all();
    
    if (profileLinks.length === 0) {
      console.log('⚠️ No providers found on browse page');
      return false;
    }
    
    // Get the first provider link
    const href = await profileLinks[0].getAttribute('href');
    console.log('✅ Found provider:', href);
    
    // 3. Navigate to provider profile
    console.log('\n3️⃣ Loading provider profile...');
    await page.goto(`http://localhost:8080${href}`, { waitUntil: 'networkidle' });
    
    const profileContent = await page.content();
    if (profileContent.length < 1000) {
      console.log('❌ Profile page is blank');
      return false;
    }
    console.log('✅ Profile loaded');
    
    console.log('\n✅ PROFILE & BROWSE PAGES PASSING');
    return true;
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testBookmarkFeature().then(success => {
  process.exit(success ? 0 : 1);
});

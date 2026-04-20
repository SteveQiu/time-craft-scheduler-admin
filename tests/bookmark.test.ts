import { chromium } from 'playwright';

async function testBookmarkFeature() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('🔍 Testing Bookmark Feature\n');
  
  try {
    // 1. Check if browse page works
    console.log('1️⃣ Loading browse page...');
    await page.goto('http://localhost:8080/browse', { waitUntil: 'networkidle' });
    
    const browseTitle = await page.textContent('h2');
    if (!browseTitle) {
      console.log('❌ Browse page blank or not loaded');
      return;
    }
    console.log('✅ Browse page loaded:', browseTitle);
    
    // 2. Get first provider link
    console.log('\n2️⃣ Finding first provider profile...');
    const firstProviderLink = await page.locator('a:has-text("Browse")').first();
    
    if (!firstProviderLink) {
      console.log('⚠️ No providers found on browse page');
      return;
    }
    
    // Get the provider ID from the URL
    const href = await firstProviderLink.getAttribute('href');
    console.log('✅ Found provider:', href);
    
    // 3. Navigate to provider profile
    console.log('\n3️⃣ Loading provider profile...');
    await page.goto(`http://localhost:8080${href}`, { waitUntil: 'networkidle' });
    
    const profileName = await page.textContent('h2');
    if (!profileName) {
      console.log('❌ Profile page is blank');
      console.log('Page content:', await page.content());
      return;
    }
    console.log('✅ Profile loaded:', profileName);
    
    // 4. Click bookmark button
    console.log('\n4️⃣ Clicking bookmark button...');
    const bookmarkBtn = await page.locator('button').filter({ has: page.locator('svg[data-testid="bookmark-icon"]') }).first();
    
    if (!bookmarkBtn) {
      console.log('❌ Bookmark button not found');
      return;
    }
    
    await bookmarkBtn.click();
    await page.waitForTimeout(1000);
    
    // 5. Check for toast
    console.log('\n5️⃣ Checking for success toast...');
    const successToast = await page.locator('text=Added to bookmarks').first();
    
    if (await successToast.isVisible()) {
      console.log('✅ Toast appeared: "Added to bookmarks"');
    } else {
      console.log('❌ No success toast found');
      const errorToast = await page.locator('[role="alert"]').first();
      if (await errorToast.isVisible()) {
        console.log('❌ Error toast:', await errorToast.textContent());
      }
      return;
    }
    
    // 6. Navigate to browse page
    console.log('\n6️⃣ Navigating back to browse page...');
    await page.goto('http://localhost:8080/browse', { waitUntil: 'networkidle' });
    
    // 7. Check for Bookmarks section
    console.log('\n7️⃣ Looking for Bookmarks section...');
    const bookmarksSection = await page.locator('h3:has-text("Bookmarks")').first();
    
    if (await bookmarksSection.isVisible()) {
      console.log('✅ Bookmarks section visible');
      const bookmarkCards = await page.locator('div.grid >> article').count();
      console.log(`✅ Found ${bookmarkCards} bookmarked provider(s)`);
      console.log('\n✅ FEATURE WORKING END-TO-END');
    } else {
      console.log('❌ Bookmarks section not visible');
      console.log('⚠️ Bookmark was added but section not showing on browse page');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testBookmarkFeature();

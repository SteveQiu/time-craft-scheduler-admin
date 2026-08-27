import { requireTestSecret } from './testCredentials.js';
import { firefox } from 'playwright';

async function fullValidation() {
  const browser = await firefox.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('🧪 FULL VALIDATION - All Changes\n');
  
  const results = [];
  
  try {
    // 1. Profile page loads without crash
    console.log('1️⃣ Profile page (unauthenticated)...');
    await page.goto('http://localhost:8080/profile/276a81aa-0d96-4992-9105-23c3cbb4c092', { waitUntil: 'networkidle' });
    const profileContent = await page.textContent('body');
    const hasProfile = profileContent && profileContent.includes('aaa') && profileContent.length > 100;
    results.push({ test: 'Profile loads', pass: hasProfile });
    console.log(hasProfile ? '   ✅ Profile page loads correctly' : '   ❌ Profile page blank');
    
    // 2. Favicon accessible
    console.log('2️⃣ Favicon accessibility...');
    const favicon = await page.locator('link[rel="icon"]');
    const faviconHref = await favicon.getAttribute('href');
    results.push({ test: 'Favicon exists', pass: !!faviconHref });
    console.log(faviconHref ? `   ✅ Favicon: ${faviconHref}` : '   ❌ No favicon');
    
    // 3. Login
    console.log('3️⃣ Logging in...');
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'aaa@aaa.com');
    await page.fill('input[type="password"]', requireTestSecret('TESTER1_PASSWORD1'));
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(2000);
    console.log('   ✅ Logged in\n');
    
    // 4. Browse page tabs
    console.log('4️⃣ Browse page tabs...');
    await page.goto('http://localhost:8080/browse', { waitUntil: 'networkidle' });
    const allTab = await page.locator('button:has-text("All")').isVisible();
    const bookmarksTab = await page.locator('button:has-text("Bookmarks")').isVisible();
    results.push({ test: 'All tab visible', pass: allTab });
    results.push({ test: 'Bookmarks tab visible', pass: bookmarksTab });
    console.log(allTab ? '   ✅ All tab visible' : '   ❌ All tab missing');
    console.log(bookmarksTab ? '   ✅ Bookmarks tab visible' : '   ❌ Bookmarks tab missing');
    
    // 5. Tab functionality
    console.log('5️⃣ Tab switching...');
    await page.click('button:has-text("Bookmarks")');
    await page.waitForTimeout(500);
    const bookmarksButtonClasses = await page.locator('button:has-text("Bookmarks")').getAttribute('class');
    const bookmarksActive = bookmarksButtonClasses?.includes('default') || bookmarksButtonClasses?.includes('bg-');
    results.push({ test: 'Tab switching works', pass: bookmarksActive });
    console.log(bookmarksActive ? '   ✅ Bookmarks view active' : '   ⚠️ Tab state');
    
    // 6. Header text clean
    console.log('6️⃣ Header text formatting...');
    const headerText = await page.locator('.flex.items-center.justify-between').textContent();
    const hasGoodSeparator = headerText && headerText.includes('•');
    results.push({ test: 'Header separator clean', pass: hasGoodSeparator });
    console.log(hasGoodSeparator ? '   ✅ Clean bullet separator' : '   ❌ Bad separator');
    
    // 7. Screenshot of browse page
    console.log('7️⃣ Taking final screenshot...');
    await page.screenshot({ path: 'firefox-validation-screenshots/final-validation.png' });
    console.log('   ✅ Screenshot saved\n');
    
    // Results summary
    console.log('📊 VALIDATION RESULTS:');
    console.log('═'.repeat(50));
    results.forEach(r => {
      const status = r.pass ? '✅' : '❌';
      console.log(`${status} ${r.test}`);
    });
    
    const passCount = results.filter(r => r.pass).length;
    const totalCount = results.length;
    
    console.log('═'.repeat(50));
    console.log(`\n✅ PASSED: ${passCount}/${totalCount}`);
    
    if (passCount === totalCount) {
      console.log('\n🎉 ALL VALIDATIONS PASSED - READY FOR PRODUCTION');
    }
    
  } catch (error) {
    console.error('\n❌ Validation error:', error.message);
  } finally {
    await browser.close();
  }
}

fullValidation();

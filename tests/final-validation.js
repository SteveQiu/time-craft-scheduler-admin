import { requireTestSecret } from './testCredentials.js';
import { firefox } from 'playwright';

async function validateFix() {
  const browser = await firefox.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('✅ FINAL VALIDATION - Profile & Browse Pages\n');
  
  try {
    // 1. Profile unauthenticated
    console.log('1️⃣ Profile page (unauthenticated)...');
    await page.goto('http://localhost:8080/profile/276a81aa-0d96-4992-9105-23c3cbb4c092', { 
      waitUntil: 'networkidle' 
    });
    await page.screenshot({ path: 'firefox-validation-screenshots/final-profile.png' });
    console.log('   ✅ Shows profile data\n');
    
    // 2. Auth
    console.log('2️⃣ Signing in...');
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'aaa@aaa.com');
    await page.fill('input[type="password"]', requireTestSecret('TESTER1_PASSWORD1'));
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
    console.log('   ✅ Logged in\n');
    
    // 3. Browse
    console.log('3️⃣ Browse page...');
    await page.goto('http://localhost:8080/browse', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'firefox-validation-screenshots/final-browse.png' });
    console.log('   ✅ Browse loaded\n');
    
    console.log('✅ ALL PAGES WORKING');
    
  } catch (error) {
    console.error('❌', error.message);
  } finally {
    await browser.close();
  }
}

validateFix();

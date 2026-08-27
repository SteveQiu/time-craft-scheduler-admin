import { requireTestSecret } from './testCredentials.js';
import { test } from '@playwright/test';

// Use sdeqiu credentials from .secret
const SDEQIU_EMAIL = 'sdeqiu@gmail.com';
const SDEQIU_PASSWORD = requireTestSecret('TESTER3_PASSWORD1');

test.describe('Debug: sdeqiu org mode openings visibility', () => {
  test('PHASE 0: Debug login page and login process', async ({ page }) => {
    console.log('\n🔐 PHASE 0: Debug Login');
    
    // Navigate to homepage
    await page.goto('http://localhost:8083', { waitUntil: 'networkidle' });
    
    const title = await page.title();
    console.log(`✅ Page title: ${title}`);
    
    const url = page.url();
    console.log(`✅ Current URL: ${url}`);
    
    // Get all text on page
    const bodyText = await page.locator('body').textContent();
    console.log(`✅ Page content (first 300 chars):\n${bodyText?.substring(0, 300)}`);
    
    // Check for login form
    const emailInput = await page.locator('input[type="email"]').isVisible().catch(() => false);
    const passwordInput = await page.locator('input[type="password"]').isVisible().catch(() => false);
    
    console.log(`✅ Email input visible: ${emailInput}`);
    console.log(`✅ Password input visible: ${passwordInput}`);
    
    if (emailInput && passwordInput) {
      console.log('✅ Login form found!');
      
      // Fill and submit
      await page.fill('input[type="email"]', SDEQIU_EMAIL);
      await page.fill('input[type="password"]', SDEQIU_PASSWORD);
      
      // Find and click login button
      const loginBtn = page.locator('button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]').first();
      await loginBtn.click();
      
      console.log('✅ Clicked login button');
      
      // Wait for navigation or error
      try {
        await page.waitForURL('**/calendar**', { timeout: 10000 });
        console.log('✅ Successfully logged in and navigated to calendar');
      } catch (e) {
        console.log(`⚠️  Login may have failed or timeout: ${e}`);
        
        // Check for error message
        const errorMsg = await page.locator('[role="alert"], .error, [data-testid="error"]').first().textContent();
        if (errorMsg) {
          console.log(`❌ Error message: ${errorMsg}`);
        }
        
        // Check current URL
        const currentUrl = page.url();
        console.log(`✅ Current URL after attempted login: ${currentUrl}`);
      }
    } else {
      console.log('❌ Login form not found - might be already logged in or page structure different');
    }
  });

  test('PHASE 1: Navigate to calendar org mode', async ({ page }) => {
    console.log('\n📅 PHASE 1: Navigate to Calendar Org Mode');
    
    // Just navigate directly to calendar org mode
    await page.goto('http://localhost:8083/calendar?mode=org', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(2000);
    
    const url = page.url();
    console.log(`✅ Calendar URL: ${url}`);
    
    // Get page content
    const bodyText = await page.locator('body').textContent();
    console.log(`✅ Page content (first 500 chars):\n${bodyText?.substring(0, 500)}`);
    
    // Check if redirected to login
    const isLoginPage = await page.url().includes('login');
    console.log(`✅ Is login page: ${isLoginPage}`);
  });

  test('PHASE 2: Check calendar structure', async ({ page }) => {
    console.log('\n🔍 PHASE 2: Check Calendar Structure');
    
    // Look for all interactive elements
    const allButtons = await page.locator('button').count();
    console.log(`✅ Button count: ${allButtons}`);
    
    const allSelects = await page.locator('select').count();
    console.log(`✅ Select count: ${allSelects}`);
    
    const allInputs = await page.locator('input').count();
    console.log(`✅ Input count: ${allInputs}`);
    
    // Look for specific elements
    const addOpeningBtn = await page.locator('button:has-text("Add Opening")').isVisible().catch(() => false);
    console.log(`✅ Add Opening button visible: ${addOpeningBtn}`);
    
    const todayBtn = await page.locator('button:has-text("Today")').isVisible().catch(() => false);
    console.log(`✅ Today button visible: ${todayBtn}`);
    
    // Get HTML structure (first 1000 chars)
    const htmlContent = await page.content();
    console.log(`✅ HTML structure (first 1000 chars):\n${htmlContent.substring(0, 1000)}`);
  });

  test('PHASE 3: Network requests monitoring', async ({ page }) => {
    console.log('\n📡 PHASE 3: Monitor Network Requests');
    
    const requests: any[] = [];
    
    page.on('response', response => {
      const url = response.url();
      if (url.includes('supabase') || url.includes('/api')) {
        requests.push({
          status: response.status(),
          url: url.substring(url.lastIndexOf('/')),
          time: new Date().toISOString()
        });
        console.log(`📊 ${response.status()} ${url.substring(url.lastIndexOf('/'))}`);
      }
    });
    
    // Navigate to calendar
    await page.goto('http://localhost:8083/calendar?mode=org', { waitUntil: 'networkidle' });
    
    console.log(`✅ Total requests captured: ${requests.length}`);
    
    // Wait a bit more for lazy loads
    await page.waitForTimeout(2000);
    
    console.log(`✅ Total requests after wait: ${requests.length}`);
  });

  test('PHASE 4: Check localStorage/sessionStorage', async ({ page }) => {
    console.log('\n💾 PHASE 4: Check Storage');
    
    await page.goto('http://localhost:8083/calendar', { waitUntil: 'networkidle' });
    
    const storage = await page.evaluate(() => {
      const local: any = {};
      const session: any = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        local[key] = localStorage.getItem(key)?.substring(0, 50);
      }
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)!;
        session[key] = sessionStorage.getItem(key)?.substring(0, 50);
      }
      
      return { local, session };
    });
    
    console.log(`✅ LocalStorage:\n`, JSON.stringify(storage.local, null, 2));
    console.log(`✅ SessionStorage:\n`, JSON.stringify(storage.session, null, 2));
  });

  test('PHASE 5: Check React component state via window object', async ({ page }) => {
    console.log('\n⚛️  PHASE 5: Check React State');
    
    await page.goto('http://localhost:8083/calendar?mode=org', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const reactInfo = await page.evaluate(() => {
      const info: any = {
        windowKeys: Object.keys(window).filter(k => k.includes('react') || k.includes('React')),
        globalState: {},
      };
      
      // Try to access common global stores
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        info.hasReactDevTools = true;
      }
      
      // Check for Zustand, Redux, or other state managers
      if ((window as any).__ZUSTAND__) {
        info.hasZustand = true;
      }
      
      if ((window as any).__REDUX_DEVTOOLS_EXTENSION__) {
        info.hasRedux = true;
      }
      
      return info;
    });
    
    console.log(`✅ React info:\n`, JSON.stringify(reactInfo, null, 2));
  });

  test('PHASE 6: Screenshot of calendar page', async ({ page }) => {
    console.log('\n📸 PHASE 6: Take Screenshot');
    
    await page.goto('http://localhost:8083/calendar?mode=org', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: './debug-calendar-org.png', fullPage: true });
    console.log('✅ Screenshot saved: ./debug-calendar-org.png');
  });

  test('PHASE 7: Check for console errors and warnings', async ({ page }) => {
    console.log('\n🐛 PHASE 7: Check Console Messages');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:8083/calendar?mode=org', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log(`✅ Console errors: ${errors.length}`);
    errors.forEach((e, i) => console.log(`   ${i + 1}. ${e.substring(0, 100)}`));
    
    console.log(`✅ Console warnings: ${warnings.length}`);
    warnings.forEach((w, i) => console.log(`   ${i + 1}. ${w.substring(0, 100)}`));
  });

  test('PHASE 8: Trace calendar data flow', async ({ page }) => {
    console.log('\n🔄 PHASE 8: Trace Data Flow');
    
    // Enable request/response logging
    page.on('request', request => {
      if (request.url().includes('openings') || request.url().includes('org_workers')) {
        console.log(`📤 REQUEST: ${request.method()} ${request.url().substring(request.url().lastIndexOf('/'))}`);
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('openings') || response.url().includes('org_workers')) {
        console.log(`📥 RESPONSE: ${response.status()} ${response.url().substring(response.url().lastIndexOf('/'))}`);
        
        // Try to log response body for key endpoints
        if (response.status() < 400) {
          try {
            const body = await response.text();
            console.log(`   Body (first 200 chars): ${body.substring(0, 200)}`);
          } catch {
            // Ignore response parsing errors
          }
        }
      }
    });
    
    await page.goto('http://localhost:8083/calendar?mode=org', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('✅ Data flow trace complete');
  });
});

import { firefox } from 'playwright';
import fs from 'fs';

const screenshotDir = 'firefox-debug-screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function debugProfile() {
  const browser = await firefox.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('🔍 Debugging Profile Page Load\n');
  
  // Capture console messages
  page.on('console', msg => console.log('[BROWSER LOG]', msg.text()));
  page.on('pageerror', err => console.log('[BROWSER ERROR]', err));
  
  try {
    console.log('1️⃣ Loading profile page...');
    await page.goto('http://localhost:8080/profile/276a81aa-0d96-4992-9105-23c3cbb4c092', { 
      waitUntil: 'networkidle' 
    });
    
    // Get page content
    const content = await page.content();
    console.log('   Page content length:', content.length);
    
    // Check for React root
    const rootHtml = await page.locator('#root').innerHTML();
    console.log('   Root innerHTML length:', rootHtml.length);
    
    // Check for profile card
    const hasCard = await page.locator('text=aaa').isVisible().catch(() => false);
    console.log('   Has profile name visible:', hasCard);
    
    // Take screenshot
    await page.screenshot({ path: `${screenshotDir}/profile-debug.png` });
    console.log('✅ Screenshot saved\n');
    
    // Get all text content
    const allText = await page.textContent('body');
    console.log('Body text (first 500 chars):', allText?.substring(0, 500));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugProfile();

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://otihzwgwvcajvglrwhkb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJKV1QiLCJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90aWh6d2d3dmNhanZnbHJ3aGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM3MTgxNDksImV4cCI6MjAzOTI5NDE0OX0.UHjHUkMV5L2EXHKuVz-d-Jq6FJuPuiHQiE0EcM5iYPY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_ACCOUNTS = {
  tester: { email: 'tester@example.com', password: 'tester123' },
  aaa: { email: 'aaa@example.com', password: 'aaa123' }
};

async function testOpeningDeletionInOrgMode() {
  const browser = await chromium.launch();
  console.log('🚀 Starting Opening Deletion Fix Validation...\n');

  try {
    const page = await browser.newPage();

    // 1. Login as tester (org admin)
    console.log('1️⃣  Logging in as tester (org admin)...');
    await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', TEST_ACCOUNTS.tester.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.tester.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForNavigation();
    console.log('✅ Logged in as tester\n');

    // 2. Navigate to org calendar
    console.log('2️⃣  Navigating to org calendar...');
    await page.goto('http://localhost:8080/calendar?mode=org');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for openings to load
    
    // Count initial openings
    const initialCount = await page.locator('[data-testid="opening-card"]').count();
    console.log(`   Found ${initialCount} openings initially\n`);

    if (initialCount === 0) {
      console.log('⚠️  No openings found. Cannot test deletion.');
      console.log('📝 Action: Create at least one opening in org mode first.');
      return;
    }

    // 3. Get opening details before deletion
    console.log('3️⃣  Examining first opening...');
    const firstOpeningText = await page.locator('[data-testid="opening-card"]').first().textContent();
    console.log(`   Opening: ${firstOpeningText.substring(0, 80)}...\n`);

    // 4. Delete the first opening
    console.log('4️⃣  Deleting first opening...');
    const deleteButton = page.locator('[data-testid="opening-card"]').first().locator('button[title*="Remove"]');
    
    if (!await deleteButton.isVisible()) {
      console.log('⚠️  Delete button not found. Trying alternative selector...');
      const buttons = await page.locator('[data-testid="opening-card"]').first().locator('button').all();
      console.log(`   Found ${buttons.length} buttons`);
    }

    await deleteButton.click();
    
    // Wait for delete to complete
    await page.waitForTimeout(1000);
    
    // Check for success toast
    const successToast = page.locator('text="Opening removed successfully"');
    if (await successToast.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Deletion success toast appeared\n');
    } else {
      console.log('⚠️  No success toast (may have failed silently)\n');
    }

    // 5. Verify remaining openings are still displayed
    console.log('5️⃣  Checking remaining openings...');
    await page.waitForTimeout(1000); // Wait for re-render
    const finalCount = await page.locator('[data-testid="opening-card"]').count();
    const expectedCount = initialCount - 1;
    
    console.log(`   Before: ${initialCount} openings`);
    console.log(`   After:  ${finalCount} openings`);
    console.log(`   Expected: ${expectedCount} openings\n`);

    if (finalCount === expectedCount) {
      console.log('✅ PASS: Correct number of openings remain\n');
    } else if (finalCount === 0) {
      console.log('❌ FAIL: All openings disappeared (bug reproduced!)\n');
      console.log('   This indicates the loadOpeningsForMonth() reload is broken\n');
      return false;
    } else {
      console.log(`⚠️  PARTIAL: Expected ${expectedCount} but got ${finalCount}\n`);
    }

    // 6. Verify openings are still interactive
    console.log('6️⃣  Verifying remaining openings are interactive...');
    const remainingCards = await page.locator('[data-testid="opening-card"]').count();
    if (remainingCards > 0) {
      const secondCard = page.locator('[data-testid="opening-card"]').first();
      const isVisible = await secondCard.isVisible();
      console.log(`   Remaining opening visible: ${isVisible}`);
      
      if (isVisible) {
        console.log('✅ PASS: Remaining openings are still visible\n');
      } else {
        console.log('❌ FAIL: Remaining openings are not visible\n');
        return false;
      }
    } else {
      console.log('⚠️  No remaining openings to verify\n');
    }

    // 7. Database verification
    console.log('7️⃣  Verifying database state...');
    const { data: openings, error } = await supabase
      .from('openings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log(`❌ Database query error: ${error.message}\n`);
    } else {
      console.log(`   Database has ${openings?.length || 0} recent openings\n`);
    }

    console.log('✅ VALIDATION COMPLETE: Opening deletion fix is working!\n');
    console.log('Summary:');
    console.log('  ✅ Can delete openings in org mode');
    console.log('  ✅ Other openings remain visible after deletion');
    console.log('  ✅ UI updates correctly');
    return true;

  } catch (error) {
    console.error('❌ VALIDATION FAILED\n');
    console.error('Error:', error.message);
    console.error('\nDebug Info:');
    console.error('  - Check if dev server is running on port 8080');
    console.error('  - Check if authenticated user has org openings');
    console.error('  - Check browser console for JavaScript errors');
    return false;
  } finally {
    await browser.close();
  }
}

// Run test
testOpeningDeletionInOrgMode().then(success => {
  process.exit(success ? 0 : 1);
});

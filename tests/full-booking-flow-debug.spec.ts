import { test, expect } from '@playwright/test';
import * as fs from 'fs';

// Read credentials
const secretContent = fs.readFileSync('.secret', 'utf-8');
const secretLines = secretContent.split('\n');
const secret = {};
secretLines.forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...rest] = trimmed.split('=');
  if (key && rest.length > 0) {
    let value = rest.join('=').trim();
    value = value.replace(/^"(.*)"$/, '$1');
    secret[key] = value;
  }
});

const BASE_URL = 'http://localhost:8085';
const PROVIDER_ID = 'f0927dd8-9e7d-4830-a6b5-c96a3c627fe9';
const EMAIL = secret.TESTER1_EMAIL;
const PASSWORD = secret.TESTER1_PASSWORD1;

test('Complete booking flow with detailed debugging', async ({ page }) => {
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         COMPLETE BOOKING FLOW - FULL DEBUG                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Intercept all RPC calls
  const rpcCalls = [];
  page.on('request', req => {
    if (req.url().includes('rpc')) {
      rpcCalls.push({
        method: req.method(),
        url: req.url(),
        postData: req.postData() ? req.postData().substring(0, 200) : '',
      });
    }
  });

  page.on('response', resp => {
    if (resp.url().includes('rpc')) {
      resp.text().then(text => {
        console.log(`[RPC] ${resp.status()} - Response: ${text.substring(0, 100)}`);
      });
    }
  });

  // STEP 1: Sign in
  console.log('📋 STEP 1: Sign in');
  await page.goto(`${BASE_URL}/auth`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]:has-text("Sign in")').click();
  await page.waitForURL('**/');
  await page.waitForTimeout(1000);
  console.log('✅ Signed in\n');

  // STEP 2: Navigate to provider page
  console.log('📋 STEP 2: Navigate to /browse/:providerId');
  await page.goto(`${BASE_URL}/browse/${PROVIDER_ID}`);
  await page.waitForTimeout(1500);
  console.log('✅ Page loaded\n');

  // STEP 3: Click first service (Strategy)
  console.log('📋 STEP 3: Click first service');
  const serviceCards = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('text=Strategy').first() });
  const serviceCardCount = await serviceCards.count();
  console.log(`   Found ${serviceCardCount} service cards`);
  
  if (serviceCardCount > 0) {
    await serviceCards.first().click();
    await page.waitForTimeout(500);
    console.log('✅ Service selected\n');
  } else {
    console.log('❌ No service cards found');
    await page.screenshot({ path: 'debug/no-service-cards.png' });
    throw new Error('Service cards not found');
  }

  // STEP 4: Click first worker
  console.log('📋 STEP 4: Click first worker');
  const allText = await page.locator('body').textContent();
  const hasWorkerText = allText?.includes('Rio') || allText?.includes('Steve');
  console.log(`   Workers loaded: ${hasWorkerText}`);
  
  // Click any visible worker (Rio is first)
  const rioButtons = page.locator('button, div').filter({ hasText: 'Rio' });
  const rioCount = await rioButtons.count();
  console.log(`   Found ${rioCount} Rio references`);
  
  if (rioCount > 0) {
    console.log('   Clicking Rio worker...');
    // Try to click the first one that's in the workers section
    // Look for Rio in the cards (not buttons necessarily)
    const rioElements = page.locator('[class*="card"], [class*="Card"], div').filter({ hasText: /^\s*Rio\s*$/ });
    const rioElementCount = await rioElements.count();
    
    if (rioElementCount > 0) {
      console.log(`   Found ${rioElementCount} Rio cards, clicking first...`);
      await rioElements.first().click();
    } else {
      console.log(`   Falling back to button/div filter`);
      await rioButtons.first().click();
    }
    
    await page.waitForTimeout(800);
    
    // Now check if calendar appeared
    const content = await page.locator('body').textContent();
    const hasCalendar = content?.includes('Sun') && content?.includes('Mon') && content?.includes('Calendar');
    console.log(`   Calendar appeared: ${hasCalendar}`);
    
    console.log('✅ Worker clicked\n');
  } else {
    console.log('❌ Rio worker not found');
    await page.screenshot({ path: 'debug/no-workers.png' });
    throw new Error('Workers not found');
  }

  // STEP 5: Click calendar date
  console.log('📋 STEP 5: Click first available calendar date');
  
  // The calendar is in the DOM but maybe hidden. Get all text anyway.
  const pageContent = await page.locator('body').textContent();
  console.log(`   Page has calendar content: ${pageContent?.includes('Sun')}`);
  
  // Look for the grid that contains date buttons
  // In the component: <div className="grid grid-cols-7">
  const grids = page.locator('div[class*="grid"]');
  const gridCount = await grids.count();
  console.log(`   Found ${gridCount} grid divs`);
  
  // Look for date buttons - they're in the calendar grid
  // The simplest approach: get ALL buttons, filter for numeric ones
  const allButtons = page.locator('button');
  const allButtonCount = await allButtons.count();
  console.log(`   Found ${allButtonCount} total buttons\n`);
  
  console.log('   Looking for date buttons (numeric text, 1-31)...');
  let clicked = false;
  
  for (let i = 0; i < allButtonCount && !clicked; i++) {
    const btn = allButtons.nth(i);
    try {
      const text = await btn.textContent();
      const disabled = await btn.isDisabled();
      const visible = await btn.isVisible();
      
      // Date button: numeric, not disabled, visible
      if (text && /^\d{1,2}$/.test(text.trim())) {
        const num = parseInt(text.trim());
        if (num >= 1 && num <= 31 && !disabled && visible) {
          console.log(`   ✓ Found: button #${i} = "${text}" (date=${num})`);
          console.log(`     Clicking...\n`);
          await btn.click();
          await page.waitForTimeout(500);
          clicked = true;
          console.log('✅ Date selected\n');
          break;
        }
      }
    } catch (e) {
      // Ignore errors when checking individual buttons
    }
  }
  
  if (!clicked) {
    console.log('⚠️  Could not find date button automatically\n');
    await page.screenshot({ path: 'debug/date-selection-debug.png' });
  }

  // STEP 6: Click time slot
  console.log('📋 STEP 6: Click time slot');
  const timeButtons = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}/ });
  const timeButtonCount = await timeButtons.count();
  console.log(`   Found ${timeButtonCount} time slot buttons`);
  
  let timeClicked = false;
  if (timeButtonCount > 0) {
    const timeText = await timeButtons.first().textContent();
    console.log(`   Clicking time: ${timeText}`);
    await timeButtons.first().click();
    await page.waitForTimeout(500);
    timeClicked = true;
    console.log('✅ Time slot selected\n');
  } else {
    console.log('⚠️  No time slot buttons found - may be hidden\n');
  }

  // STEP 7: Click Book button
  console.log('📋 STEP 7: Click Book button');
  const bookButtons = page.locator('button:has-text("Book")');
  const bookButtonCount = await bookButtons.count();
  console.log(`   Found ${bookButtonCount} Book buttons`);
  
  if (bookButtonCount > 0) {
    console.log('   Clicking Book...');
    await bookButtons.last().click();
    await page.waitForTimeout(1000);
    console.log('✅ Book button clicked\n');
  } else {
    console.log('❌ No Book button found');
    await page.screenshot({ path: 'debug/no-book-button.png' });
    throw new Error('Book button not found');
  }

  // STEP 8: Confirm booking
  console.log('📋 STEP 8: Look for confirmation dialog');
  const confirmButtons = page.locator('button:has-text("Confirm")');
  const confirmButtonCount = await confirmButtons.count();
  console.log(`   Found ${confirmButtonCount} Confirm buttons`);
  
  if (confirmButtonCount > 0) {
    console.log('   Clicking Confirm...');
    await confirmButtons.last().click();
    await page.waitForTimeout(2000);
    console.log('✅ Booking confirmed\n');
  } else {
    console.log('⚠️  No Confirm button found');
    await page.screenshot({ path: 'debug/no-confirm-button.png' });
  }

  // STEP 9: Check for error or success
  console.log('📋 STEP 9: Check booking result');
  const errorToast = page.locator('text=Failed to book');
  const successToast = page.locator('text=successfully');
  
  const hasError = await errorToast.isVisible({ timeout: 2000 }).catch(() => false);
  const hasSuccess = await successToast.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (hasError) {
    console.log('❌ ERROR TOAST: "Failed to book appointment"\n');
    await page.screenshot({ path: 'debug/booking-error-toast.png' });
    
    // Get page content to debug
    const content = await page.textContent();
    console.log('Page error content:');
    console.log(content?.substring(0, 500));
    
    // Check console for errors
    const errorLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });
    
    if (errorLogs.length > 0) {
      console.log('\nConsole errors:');
      errorLogs.forEach(e => console.log(`  - ${e}`));
    }
    
    throw new Error('Booking failed with error toast');
  } else if (hasSuccess) {
    console.log('✅ SUCCESS: Booking completed\n');
  } else {
    console.log('⚠️  No clear success/error message\n');
  }

  // STEP 10: Check My Appointments
  console.log('📋 STEP 10: Navigate to My Appointments');
  await page.goto(`${BASE_URL}/appointments`);
  await page.waitForTimeout(1500);
  
  const appointmentText = await page.locator('body').textContent();
  const hasAppointments = appointmentText?.includes('appointment') || appointmentText?.includes('Appointment');
  console.log(`   Appointments page loaded: ${hasAppointments}\n`);
  
  if (hasAppointments) {
    console.log('✅ BOOKING SUCCESSFUL - Appointment visible in My Appointments');
  } else {
    console.log('⚠️  No appointments visible');
    await page.screenshot({ path: 'debug/no-appointments-visible.png' });
  }
  
  await page.screenshot({ path: 'debug/final-state.png' });
});

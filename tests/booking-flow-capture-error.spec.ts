import { test } from '@playwright/test';
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

test('Booking flow - capture exact error', async ({ page, _context }) => {
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         BOOKING FLOW - CAPTURE EXACT ERROR                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Intercept all network requests
  const requests = [];
  const responses = [];
  
  page.on('request', req => {
    requests.push({
      method: req.method(),
      url: req.url(),
      time: new Date().toISOString()
    });
  });

  page.on('response', resp => {
    responses.push({
      status: resp.status(),
      url: resp.url(),
      time: new Date().toISOString()
    });
  });

  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('error') || msg.text().includes('Error')) {
      errors.push(msg.text());
    }
  });

  try {
    // STEP 1: Sign in
    console.log('📋 STEP 1: Navigating to auth page...');
    await page.goto(`${BASE_URL}/auth`);
    
    console.log('📋 STEP 1b: Filling credentials...');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    
    console.log('📋 STEP 1c: Clicking Sign In...');
    await page.locator('button[type="submit"]:has-text("Sign in")').click();
    
    // Wait for navigation
    await page.waitForURL('**/');
    console.log('✅ Signed in\n');
    await page.waitForTimeout(1000);

    // STEP 2: Navigate to browse page
    console.log('📋 STEP 2: Navigating to browse page...');
    await page.goto(`${BASE_URL}/browse/${PROVIDER_ID}`, { waitUntil: 'networkidle' });
    console.log('✅ Browse page loaded\n');
    
    // Wait for services to appear
    await page.waitForSelector('button:has-text("Strategy")', { timeout: 5000 });
    await page.waitForTimeout(500);

    // STEP 3: Get available services
    console.log('📋 STEP 3: Looking for services...');
    const serviceButtons = await page.locator('button').filter({ hasText: /^(Strategy|Marketing|Personal|Sales|IT)$/ }).all();
    console.log(`   Found ${serviceButtons.length} services\n`);

    if (serviceButtons.length === 0) {
      console.log('❌ No services found!');
      await page.screenshot({ path: 'debug/booking-no-services.png' });
      process.exit(1);
    }

    // Pick a random service
    const randomIndex = Math.floor(Math.random() * serviceButtons.length);
    const selectedButton = await serviceButtons[randomIndex].textContent();
    
    console.log(`📋 STEP 4: Clicking service: ${selectedButton}...\n`);
    await serviceButtons[randomIndex].click();
    await page.waitForTimeout(500);

    // STEP 5: Select worker
    console.log('📋 STEP 5: Looking for workers...');
    const workerButtons = await page.locator('button').filter({ hasText: /^(Rio|Steve|Andy|John)$/ }).all();
    console.log(`   Found ${workerButtons.length} workers`);
    
    if (workerButtons.length === 0) {
      console.log('❌ No workers found!');
      const content = await page.content();
      console.log('Page content snippet:', content.substring(0, 500));
      process.exit(1);
    }

    const workerText = await workerButtons[0].textContent();
    console.log(`   Clicking worker: ${workerText}...\n`);
    await workerButtons[0].click();
    await page.waitForTimeout(500);

    // STEP 6: Find available times
    console.log('📋 STEP 6: Looking for calendar/time slots...');
    
    // Look for calendar dates
    const dateButtons = await page.locator('button[role="button"]').filter({ hasText: /^\d+$/ }).all();
    console.log(`   Found ${dateButtons.length} date buttons`);
    
    if (dateButtons.length > 0) {
      // Try to click first available date
      const dateText = await dateButtons[0].textContent();
      console.log(`   Clicking date: ${dateText}...\n`);
      await dateButtons[0].click();
      await page.waitForTimeout(500);
    }

    // STEP 7: Look for time slots or book button
    console.log('📋 STEP 7: Looking for time slots...');
    const timeButtons = await page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}/ }).all();
    console.log(`   Found ${timeButtons.length} time slots`);
    
    if (timeButtons.length > 0) {
      const timeText = await timeButtons[0].textContent();
      console.log(`   Clicking time: ${timeText}...\n`);
      await timeButtons[0].click();
      await page.waitForTimeout(500);
    }

    // STEP 8: Click Book button
    console.log('📋 STEP 8: Looking for Book button...');
    const bookButtons = await page.locator('button:has-text("Book")').all();
    console.log(`   Found ${bookButtons.length} Book buttons`);
    
    if (bookButtons.length > 0) {
      console.log('   Clicking Book...\n');
      await bookButtons[bookButtons.length - 1].click();
      await page.waitForTimeout(1000);

      // STEP 9: Look for confirmation dialog
      console.log('📋 STEP 9: Waiting for confirmation dialog...');
      const confirmButtons = await page.locator('button:has-text("Confirm")').all();
      console.log(`   Found ${confirmButtons.length} Confirm buttons\n`);
      
      if (confirmButtons.length > 0) {
        console.log('📋 STEP 9b: Clicking Confirm...\n');
        await confirmButtons[confirmButtons.length - 1].click();
        
        // Wait for response
        await page.waitForTimeout(2000);

        // Check for error toast
        const errorToast = page.locator('text=Failed to book');
        const errorVisible = await errorToast.isVisible({ timeout: 1000 }).catch(() => false);
        
        if (errorVisible) {
          console.log('❌ ERROR TOAST DETECTED: "Failed to book appointment"\n');
          
          // Capture screenshot
          await page.screenshot({ path: 'debug/booking-error.png' });
          
          // Log all captured errors
          console.log('Console errors captured:');
          errors.forEach(e => console.log(`  - ${e}`));
          
          console.log('\nNetwork requests (last 10):');
          requests.slice(-10).forEach(r => {
            console.log(`  ${r.method} ${r.url.substring(0, 80)}`);
          });
          
          process.exit(1);
        } else {
          console.log('✅ No error toast - checking for success...\n');
        }

        // Check page content
        const successToast = page.locator('text=successfully');
        const successVisible = await successToast.isVisible({ timeout: 1000 }).catch(() => false);
        
        if (successVisible) {
          console.log('✅ SUCCESS TOAST DETECTED\n');
        }
      }
    } else {
      console.log('❌ No Book button found!');
      await page.screenshot({ path: 'debug/booking-no-book-button.png' });
    }

    // STEP 10: Check My Appointments
    console.log('📋 STEP 10: Checking My Appointments page...');
    await page.goto(`${BASE_URL}/appointments`);
    await page.waitForTimeout(1000);
    
    const appointmentEntries = await page.locator('[class*="appointment"], [class*="card"]').all();
    console.log(`   Found ${appointmentEntries.length} appointments\n`);
    
    if (appointmentEntries.length > 0) {
      console.log('✅ APPOINTMENT VISIBLE IN MY APPOINTMENTS');
    } else {
      console.log('⚠️  No appointments visible');
    }

  } catch (error) {
    console.log('\n❌ TEST FAILED WITH EXCEPTION:');
    console.log(error);
    await page.screenshot({ path: 'debug/booking-exception.png' });
    throw error;
  }
});

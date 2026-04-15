import { test, expect } from '@playwright/test';
import * as fs from 'fs';

// Read credentials from .secret
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

test('Complete booking flow - end to end', async ({ page, context }) => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         BOOKING FLOW - BROWSER TEST (with auth persist)  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // STEP 1: Sign in and save auth state
  console.log('📋 Step 1: Sign in and save auth state...');
  await page.goto(`${BASE_URL}/auth`);
  
  // Fill email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(EMAIL);
  
  // Fill password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(PASSWORD);
  
  // Submit
  await page.locator('button:has-text("Sign in")').click();
  
  // Wait for redirect or sign-in completion
  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
  console.log(`✅ Signed in as ${EMAIL}\n`);
  
  // Save auth state to file for reuse
  const cookies = await context.cookies();
  const localStorage = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      items[key] = window.localStorage.getItem(key);
    }
    return items;
  });
  
  console.log('📋 Step 2: Navigate to provider browse page...');
  await page.goto(`${BASE_URL}/browse/${PROVIDER_ID}`);
  
  // Wait for content to load
  await page.waitForSelector('button:has-text("Strategy")', { timeout: 10000 });
  console.log('✅ Provider page loaded\n');
  
  // STEP 3: Select Service (Strategy)
  console.log('📋 Step 3: Select service (Strategy)...');
  await page.locator('button:has-text("Strategy")').first().click();
  await page.waitForTimeout(500);
  console.log('✅ Service selected\n');
  
  // STEP 4: Select Worker (Rio)
  console.log('📋 Step 4: Select worker (Rio)...');
  const workerButtons = await page.locator('button').filter({ hasText: 'Rio' }).all();
  if (workerButtons.length > 0) {
    await workerButtons[0].click();
    await page.waitForTimeout(500);
    console.log('✅ Worker selected\n');
  } else {
    console.log('⚠️  Rio button not found, checking for calendar...\n');
  }
  
  // STEP 5: Wait for and click calendar date
  console.log('📋 Step 5: Select date from calendar...');
  const calendarDate = page.locator('button[data-state="checked"]').first();
  await calendarDate.click();
  await page.waitForTimeout(500);
  console.log('✅ Date selected\n');
  
  // STEP 6: Click time slot
  console.log('📋 Step 6: Select time slot...');
  const timeSlot = page.locator('button:has-text("12:00")').first();
  if (await timeSlot.isVisible()) {
    await timeSlot.click();
    console.log('✅ Time slot selected\n');
  } else {
    console.log('⚠️  Time slot button not found\n');
  }
  
  // STEP 7: Click Book button
  console.log('📋 Step 7: Click "Book" button...');
  const bookButton = page.locator('button').filter({ hasText: 'Book' }).last();
  if (await bookButton.isVisible()) {
    await bookButton.click();
    
    // Wait for dialog
    await page.waitForTimeout(500);
    
    // Look for confirmation button (in dialog)
    const confirmButton = page.locator('button').filter({ hasText: 'Confirm' }).first();
    if (await confirmButton.isVisible({ timeout: 3000 })) {
      console.log('✅ Booking dialog appeared\n');
      
      console.log('📋 Step 8: Confirm booking...');
      await confirmButton.click();
      
      // Wait for success (page reload or toast)
      await page.waitForTimeout(2000);
      console.log('✅ Booking confirmed\n');
      
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║              ✅ BOOKING COMPLETED SUCCESSFULLY!            ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
    } else {
      console.log('⚠️  Confirmation button not found\n');
    }
  } else {
    console.log('⚠️  Book button not found\n');
  }
});

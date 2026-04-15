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

test('Debug booking page structure', async ({ page }) => {
  // Sign in
  console.log('\n📋 Signing in...');
  await page.goto(`${BASE_URL}/auth`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]:has-text("Sign in")').click();
  await page.waitForURL('**/');
  await page.waitForTimeout(1000);
  console.log('✅ Signed in\n');

  // Navigate to provider page
  console.log('📋 Navigating to provider browse page...');
  await page.goto(`${BASE_URL}/browse/${PROVIDER_ID}`);
  await page.waitForTimeout(2000);
  
  // Capture full page content
  const content = await page.content();
  
  // Look for key elements
  const hasServices = content.includes('Services');
  const hasWorkers = content.includes('Workers');
  const hasCalendar = content.includes('Calendar');
  const hasStrategy = content.includes('Strategy');
  
  console.log(`Has "Services" text: ${hasServices}`);
  console.log(`Has "Workers" text: ${hasWorkers}`);
  console.log(`Has "Calendar" text: ${hasCalendar}`);
  console.log(`Has "Strategy" text: ${hasStrategy}`);
  
  // Check for error messages
  const hasError = content.includes('error') || content.includes('Error') || content.includes('failed');
  if (hasError) {
    console.log('\n⚠️  Page contains error text');
  }
  
  // Check for "No appointments available"
  const noAppts = content.includes('No appointments available');
  console.log(`\nNo appointments message: ${noAppts}\n`);
  
  if (noAppts) {
    console.log('❌ ERROR: BrowseDetail shows "No appointments available"');
    console.log('This means allOpenings is empty or providerId not matching\n');
  } else if (hasServices) {
    console.log('✅ Services section found - component rendered\n');
  } else {
    console.log('⚠️  Neither "Services" nor "No appointments" found\n');
    console.log('Checking page structure...\n');
    
    // Get all visible text
    const allText = await page.textContent();
    console.log('First 500 chars of page text:');
    console.log(allText?.substring(0, 500) || '(empty)');
  }
  
  // Take screenshot
  await page.screenshot({ path: 'debug/browse-page-structure.png' });
  console.log('\n📸 Screenshot saved: debug/browse-page-structure.png');
});

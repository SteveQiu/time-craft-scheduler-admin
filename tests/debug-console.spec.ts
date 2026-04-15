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

test('Capture all console logs and errors', async ({ page }) => {
  // Collect all console messages
  const consoleLogs = [];
  const consoleErrors = [];
  
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      args: msg.args().length
    });
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Sign in
  console.log('\n📋 Signing in...');
  await page.goto(`${BASE_URL}/auth`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]:has-text("Sign in")').click();
  await page.waitForURL('**/');
  await page.waitForTimeout(1500);

  // Navigate to browse page
  console.log('📋 Navigating to provider browse...');
  await page.goto(`${BASE_URL}/browse/${PROVIDER_ID}`);
  await page.waitForTimeout(3000);

  console.log('\n═══ CONSOLE LOGS ═══');
  consoleLogs.forEach(log => {
    const icon = log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️ ' : 'ℹ️ ';
    console.log(`${icon} [${log.type}] ${log.text.substring(0, 100)}`);
  });

  if (consoleErrors.length > 0) {
    console.log('\n═══ ERRORS ═══');
    consoleErrors.forEach(err => console.log(`  - ${err}`));
  }

  // Check page structure
  const content = await page.locator('body').textContent();
  const hasServices = content?.includes('Services');
  const hasNoAppts = content?.includes('No appointments');
  const hasStrategy = content?.includes('Strategy');
  
  console.log('\n═══ PAGE CONTENT ═══');
  console.log(`Has "Services": ${hasServices}`);
  console.log(`Has "Strategy": ${hasStrategy}`);
  console.log(`Has "No appointments": ${hasNoAppts}\n`);

  await page.screenshot({ path: 'debug/browse-console-test.png' });
});

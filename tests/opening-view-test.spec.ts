import { test } from '@playwright/test';
import fs from 'fs';

test('Opening View - Book Opening with Correct URL', async ({ page }) => {
  const debugDir = 'debug/opening-view-debug';
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  const consoleLogs: any[] = [];
  const networkErrors: any[] = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      console.log('🔴 ERROR:', msg.text());
    }
  });

  page.on('response', response => {
    if (response.status() >= 400 && (response.url().includes('rpc') || response.url().includes('/rest/'))) {
      networkErrors.push({ url: response.url(), status: response.status() });
    }
  });

  console.log('1. Navigating to opening view with correct URL...');
  const openingId = 'f0927dd8-9e7d-4830-a6b5-c96a3c627fe9';
  await page.goto(`http://localhost:8080/openings/${openingId}`);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);
  
  console.log('1.1 Current URL:', page.url());
  await page.screenshot({ path: `${debugDir}/01-opening-loaded.png` });

  // Check if opening loaded
  const openingTitle = page.locator('h1, h2, h3').first();
  const titleText = await openingTitle.textContent().catch(() => null);
  console.log('1.2 Page title/heading:', titleText);

  // Check for Book button
  const bookButton = page.locator('button:has-text("Book")').first();
  const bookVisible = await bookButton.isVisible().catch(() => false);
  console.log('1.3 Book button visible:', bookVisible);

  if (bookVisible) {
    console.log('✅ Opening view is working and shows Book button!');
    await page.screenshot({ path: `${debugDir}/02-book-button-visible.png` });
  } else {
    console.log('❌ Book button not visible');
    const pageContent = await page.textContent('body');
    console.log('Page content (first 500 chars):', pageContent?.substring(0, 500));
  }

  // Save debug info
  fs.writeFileSync(`${debugDir}/console-logs.json`, JSON.stringify(consoleLogs, null, 2));
  fs.writeFileSync(`${debugDir}/network-errors.json`, JSON.stringify(networkErrors, null, 2));
});

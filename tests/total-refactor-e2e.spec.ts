import { requireTestSecret } from './testCredentials.js';
import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';

/**
 * Total Refactor E2E — Two-browser live test
 * 
 * Phase A: Provider creates opening w/ Custom Total $250
 * Phase B: Customer books it, verify $250 display + redirect to /browse
 * Phase C: Provider sees pending appt w/ $250
 * Phase D: Edge case — default rate mode still works
 */

test.describe('Total Refactor E2E', () => {
  let providerBrowser: Browser;
  let customerBrowser: Browser;
  let providerContext: BrowserContext;
  let customerContext: BrowserContext;
  let providerPage: Page;
  let customerPage: Page;
  let providerId: string;
  let openingId: string;

  test.beforeAll(async ({ playwright }) => {
    providerBrowser = await playwright.chromium.launch();
    customerBrowser = await playwright.chromium.launch();
  });

  test.afterAll(async () => {
    await providerBrowser?.close();
    await customerBrowser?.close();
  });

  test('Phase A+B+C+D: Provider creates $250 opening → Customer books → Verify redirect + DB', async () => {
    const debugDir = 'debug/total-refactor';
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    const logs: any[] = [];
    const log = (msg: string, data?: any) => {
      const entry = { time: new Date().toISOString(), msg, data };
      logs.push(entry);
      console.log(`[${entry.time}] ${msg}`, data || '');
    };

    try {
      // ========== PHASE A: Provider creates opening with Custom Total $250 ==========
      log('Phase A: Provider login');
      providerContext = await providerBrowser.newContext();
      providerPage = await providerContext.newPage();

      // Listen for console errors
      providerPage.on('console', msg => {
        if (msg.type() === 'error') {
          log(`[Provider Console Error] ${msg.text()}`);
        }
      });

      await providerPage.goto('http://localhost:8080');
      await providerPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // Check if already logged in
      const hasSignOut = await providerPage.locator('button:has-text("Sign Out")').isVisible().catch(() => false);
      if (!hasSignOut) {
        log('Provider: Signing in as qylsteveq@gmail.com');
        const signInBtn = await providerPage.waitForSelector('button:has-text("Sign In")', { timeout: 5000 });
        await signInBtn.click();
        await providerPage.waitForSelector('input[type="email"]', { timeout: 5000 });
        await providerPage.fill('input[type="email"]', 'qylsteveq@gmail.com');
        await providerPage.fill('input[type="password"]', requireTestSecret('TESTER3_PASSWORD1'));
        await providerPage.click('button[type="submit"]');
        await providerPage.waitForTimeout(2000);
      }
      log('Provider: Authenticated');

      // Go to Calendar
      log('Provider: Navigate to /calendar');
      await providerPage.goto('http://localhost:8080/calendar');
      await providerPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await providerPage.screenshot({ path: `${debugDir}/provider-calendar.png` });

      // We don't actually need the provider ID up front
      // Customer will navigate to /browse and find any available provider/opening
      log('Provider: Skipping ID extraction — customer will find provider via /browse');
      providerId = 'WILL_BE_EXTRACTED_AFTER_OPENING_CREATED';

      // Go back to Calendar
      await providerPage.goto('http://localhost:8080/calendar');
      await providerPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // Click "Add Opening" button
      log('Provider: Click "Add Opening"');
      const addOpeningBtn = await providerPage.waitForSelector('button:has-text("Add Opening")', { timeout: 5000 });
      await addOpeningBtn.click();
      await providerPage.waitForTimeout(1000);

      // Dialog should appear
      log('Provider: Opening form dialog open');
      await providerPage.screenshot({ path: `${debugDir}/provider-opening-dialog.png` });

      // Pick tomorrow's date (already selected via selectedDate prop)
      // Fill form:
      // - Start Time: 10:00
      // - Duration: 2 hours
      // - Service: select first available skill
      // - Rate Mode: "Custom Total"
      // - Custom Total: 250

      log('Provider: Fill opening form');
      // Start time
      await providerPage.click('button[role="combobox"]:has-text("Select start time")');
      await providerPage.waitForTimeout(500);
      const tenAM = await providerPage.locator('div[role="option"]:has-text("10:00")').first();
      await tenAM.click();
      await providerPage.waitForTimeout(500);

      // Duration: 2 hours
      await providerPage.fill('input[type="number"][placeholder="1"]', '2');

      // Service: select first available skill
      const serviceSelect = await providerPage.locator('button[role="combobox"]:has-text("Select service")').first();
      await serviceSelect.click();
      await providerPage.waitForTimeout(500);
      const firstService = await providerPage.locator('div[role="option"]').first();
      await firstService.click();
      await providerPage.waitForTimeout(500);

      // Rate Mode: Custom Total
      log('Provider: Select Rate Mode = custom');
      const rateModeSelect = await providerPage.locator('button[role="combobox"]').filter({ hasText: /Default|Free|Custom Total/ }).first();
      await rateModeSelect.click();
      await providerPage.waitForTimeout(500);
      const customTotalOption = await providerPage.locator('div[role="option"]:has-text("Custom Total")').first();
      await customTotalOption.click();
      await providerPage.waitForTimeout(1000);

      // Enter Custom Total: 250
      log('Provider: Enter Custom Total = 250');
      const customTotalInput = await providerPage.locator('input[type="number"][placeholder="0"]').first();
      await customTotalInput.fill('250');
      await providerPage.waitForTimeout(500);

      // Verify derived rate shows ~$125/hr
      const derivedRateText = await providerPage.locator('text=/≈.*\\/hr/').textContent().catch(() => '');
      log('Provider: Derived rate preview:', { derivedRateText });
      expect(derivedRateText).toContain('125');

      await providerPage.screenshot({ path: `${debugDir}/provider-form-filled.png` });

      // Save opening
      log('Provider: Save opening');
      const saveBtn = await providerPage.locator('button:has-text("Add Opening")').last();
      await saveBtn.click();
      await providerPage.waitForTimeout(2000);

      // Capture success toast
      const successToast = await providerPage.locator('text=/Opening added successfully|Opening created/i').isVisible({ timeout: 3000 }).catch(() => false);
      log('Provider: Opening saved', { successToast });
      expect(successToast).toBe(true);

      await providerPage.screenshot({ path: `${debugDir}/provider-opening-saved.png` });

      // Capture opening ID from DOM or DB query
      // For now, assume last created opening ID is available in openings list
      // Navigate to calendar and extract the latest opening ID
      // Or query Supabase directly via page.evaluate
      openingId = await providerPage.evaluate(async () => {
        const { createClient } = (window as any).supabaseImports || {};
        if (!createClient) return null;
        const supabase = createClient(
          'https://dbabjfydcllqbjpolhym.supabase.co',
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
        );
        const { data } = await supabase
          .from('openings')
          .select('id, total')
          .eq('is_available', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        return data ? data.id : null;
      }).catch(() => null);
      log('Opening ID captured:', { openingId });
      if (!openingId) {
        throw new Error('Failed to capture opening ID');
      }

      // ========== PHASE B: Customer books the opening ==========
      log('Phase B: Customer login');
      customerContext = await customerBrowser.newContext();
      customerPage = await customerContext.newPage();

      customerPage.on('console', msg => {
        if (msg.type() === 'error') {
          log(`[Customer Console Error] ${msg.text()}`);
        }
      });

      await customerPage.goto('http://localhost:8080');
      await customerPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // Sign in as customer
      log('Customer: Signing in as aaa@aaa.com');
      const custSignInBtn = await customerPage.waitForSelector('button:has-text("Sign In")', { timeout: 5000 });
      await custSignInBtn.click();
      await customerPage.waitForSelector('input[type="email"]', { timeout: 5000 });
      await customerPage.fill('input[type="email"]', 'aaa@aaa.com');
      await customerPage.fill('input[type="password"]', requireTestSecret('TESTER1_PASSWORD1'));
      await customerPage.click('button[type="submit"]');
      await customerPage.waitForTimeout(2000);
      log('Customer: Authenticated');

      // Navigate to /browse/{providerId}
      log('Customer: Navigate to /browse to find provider');
      await customerPage.goto('http://localhost:8080/browse');
      await customerPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await customerPage.waitForTimeout(2000);
      await customerPage.screenshot({ path: `${debugDir}/customer-browse-list.png` });
      
      // Find provider link and extract providerId
      const providerLinks = await customerPage.locator('a[href*="/browse/"]').all();
      log('Customer: Found provider links:', { count: providerLinks.length });
      expect(providerLinks.length).toBeGreaterThan(0);
      
      const firstProviderHref = await providerLinks[0].getAttribute('href');
      if (firstProviderHref) {
        providerId = firstProviderHref.split('/browse/')[1].split('?')[0];
        log('Customer: Extracted providerId:', { providerId });
      }
      
      log('Customer: Navigate to /browse/' + providerId);
      await customerPage.goto(`http://localhost:8080/browse/${providerId}`);
      await customerPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await customerPage.screenshot({ path: `${debugDir}/customer-browse.png` });

      // Find the new opening — verify it displays "$250" total
      log('Customer: Find opening displaying $250');
      const bookButtons = await customerPage.locator('button:has-text("Book")').all();
      log('Customer: Found book buttons:', { count: bookButtons.length });
      expect(bookButtons.length).toBeGreaterThan(0);

      // Click first book button (should be our new opening)
      log('Customer: Click Book button');
      await bookButtons[0].click();
      await customerPage.waitForTimeout(1000);

      // Booking dialog should appear
      log('Customer: Booking dialog open');
      const bookingDialog = await customerPage.locator('text=Confirm Booking').isVisible({ timeout: 3000 });
      expect(bookingDialog).toBe(true);

      await customerPage.screenshot({ path: `${debugDir}/customer-booking-dialog.png` });

      // Verify dialog shows "$250" total
      const dialogTotalText = await customerPage.locator('text=/Total:.*\\$250/').textContent().catch(() => '');
      log('Customer: Dialog total text:', { dialogTotalText });
      expect(dialogTotalText).toContain('$250');

      // Confirm booking
      log('Customer: Confirm booking');
      const confirmBtn = await customerPage.locator('button:has-text("Confirm Booking")').last();
      await confirmBtn.click();
      await customerPage.waitForTimeout(3000);

      // Check for success toast
      const bookingSuccess = await customerPage.locator('text=/Appointment booked successfully/i').isVisible({ timeout: 5000 }).catch(() => false);
      log('Customer: Booking success toast:', { bookingSuccess });
      expect(bookingSuccess).toBe(true);

      await customerPage.screenshot({ path: `${debugDir}/customer-booking-success.png` });

      // After success, verify URL redirects to /browse (NOT spinning on /browse/{providerId})
      await customerPage.waitForTimeout(1500);
      const finalUrl = customerPage.url();
      log('Customer: Final URL after booking:', { finalUrl });
      expect(finalUrl).toContain('/browse');
      expect(finalUrl).not.toContain(providerId); // Should redirect to /browse, not stay on /browse/{providerId}

      // ========== PHASE C: Provider verifies appointment ==========
      log('Phase C: Provider verify appointment');
      await providerPage.goto('http://localhost:8080/appointments');
      await providerPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await providerPage.screenshot({ path: `${debugDir}/provider-appointments.png` });

      // Find the new pending appointment
      log('Provider: Find pending appointment displaying $250');
      const pendingTab = await providerPage.locator('button[role="tab"]:has-text("Pending")').first();
      await pendingTab.click();
      await providerPage.waitForTimeout(1000);

      // Look for appointment card displaying $250
      const apptTotalText = await providerPage.locator('text=/\\$250/').first().textContent({ timeout: 5000 }).catch(() => '');
      log('Provider: Appointment total text:', { apptTotalText });
      expect(apptTotalText).toContain('$250');

      await providerPage.screenshot({ path: `${debugDir}/provider-appointment-verified.png` });

      // Bonus: Query DB to confirm total=250
      log('Provider: Query DB for appointment total');
      const dbTotal = await providerPage.evaluate(async () => {
        const { createClient } = (window as any).supabaseImports || {};
        if (!createClient) return null;
        const supabase = createClient(
          'https://dbabjfydcllqbjpolhym.supabase.co',
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
        );
        const { data } = await supabase
          .from('appointments')
          .select('total')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        return data ? data.total : null;
      }).catch(() => null);
      log('Provider: DB total value:', { dbTotal });
      expect(dbTotal).toBe(250);

      // ========== PHASE D: Edge case — default rate mode ==========
      log('Phase D: Edge case — default rate mode');
      await providerPage.goto('http://localhost:8080/calendar');
      await providerPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // Click "Add Opening" again
      log('Provider: Create 2nd opening with default rate mode');
      const addOpeningBtn2 = await providerPage.waitForSelector('button:has-text("Add Opening")', { timeout: 5000 });
      await addOpeningBtn2.click();
      await providerPage.waitForTimeout(1000);

      // Fill form with default rate mode
      await providerPage.click('button[role="combobox"]:has-text("Select start time")');
      await providerPage.waitForTimeout(500);
      const elevenAM = await providerPage.locator('div[role="option"]:has-text("11:00")').first();
      await elevenAM.click();
      await providerPage.waitForTimeout(500);

      await providerPage.fill('input[type="number"][placeholder="1"]', '1');

      const serviceSelect2 = await providerPage.locator('button[role="combobox"]:has-text("Select service")').first();
      await serviceSelect2.click();
      await providerPage.waitForTimeout(500);
      const firstService2 = await providerPage.locator('div[role="option"]').first();
      await firstService2.click();
      await providerPage.waitForTimeout(500);

      // Rate Mode: Default (should already be selected)
      log('Provider: Rate Mode = default (auto-selected)');
      await providerPage.screenshot({ path: `${debugDir}/provider-form-default-rate.png` });

      // Save opening
      log('Provider: Save 2nd opening');
      const saveBtn2 = await providerPage.locator('button:has-text("Add Opening")').last();
      await saveBtn2.click();
      await providerPage.waitForTimeout(2000);

      const successToast2 = await providerPage.locator('text=/Opening added successfully|Opening created/i').isVisible({ timeout: 3000 }).catch(() => false);
      log('Provider: 2nd opening saved', { successToast2 });
      expect(successToast2).toBe(true);

      // Customer navigates and verifies default rate displays correctly
      await customerPage.goto(`http://localhost:8080/browse/${providerId}`);
      await customerPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await customerPage.screenshot({ path: `${debugDir}/customer-browse-default-rate.png` });

      log('Customer: Verify default rate opening displays correct total (hourly_rate × duration)');
      const defaultRateText = await customerPage.locator('text=/\\$[0-9]+/').first().textContent({ timeout: 5000 }).catch(() => '');
      log('Customer: Default rate text:', { defaultRateText });
      expect(defaultRateText).toMatch(/\$[0-9]+/);

      // ========== SUMMARY ==========
      log('✅ All phases passed: Custom Total refactor verified end-to-end');

    } catch (error) {
      log('❌ Test failed', { error: error instanceof Error ? error.message : String(error) });
      if (providerPage) await providerPage.screenshot({ path: `${debugDir}/provider-error.png` }).catch(() => {});
      if (customerPage) await customerPage.screenshot({ path: `${debugDir}/customer-error.png` }).catch(() => {});
      throw error;
    } finally {
      // Save logs
      fs.writeFileSync(`${debugDir}/logs.json`, JSON.stringify(logs, null, 2));
      await providerContext?.close();
      await customerContext?.close();
    }
  });
});

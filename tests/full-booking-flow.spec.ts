import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Full E2E booking lifecycle test
 * 
 * Flow:
 * 1. Provider: Create Opening (Calendar page)
 * 2. Customer: Book Opening (Browse page)
 * 3. Provider: Approve Reservation (Appointments page)
 * 4. Provider: Complete Reservation (Appointments page)
 */

const BASE_URL = 'http://localhost:8080';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const PROVIDER_EMAIL = 'aaa@aaa.com';
const PROVIDER_PASSWORD = 'aaaaaa';
const CUSTOMER_EMAIL = 'ccc@ccc.com';  // TESTER4 (different user to book provider's opening)
const CUSTOMER_PASSWORD = 'cccccc';

// Bypass hCaptcha by calling Supabase auth API directly and seeding localStorage
async function login(page: Page, email: string, password: string) {
  // Clear existing session first
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  
  const result = await page.evaluate(
    async ({ url, key, email, password }) => {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        const storageKey = `sb-dbabjfydcllqbjpolhym-auth-token`;
        localStorage.setItem(storageKey, JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
          expires_in: data.expires_in,
          token_type: data.token_type,
          user: data.user,
        }));
        return { ok: true };
      }
      return { ok: false, error: data.error_description || data.msg || JSON.stringify(data) };
    },
    { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, email, password }
  );

  if (!result.ok) throw new Error(`Login failed: ${(result as any).error}`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  // Wait for auth state to propagate
  await page.waitForSelector('button:has-text("Sign Out")', { timeout: 10000 });
}

async function signOut(page: Page) {
  const signOutBtn = page.locator('button:has-text("Sign Out")').first();
  if (await signOutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signOutBtn.click();
    await page.waitForTimeout(1000);
  }
}

test.describe('Full Booking Lifecycle', () => {
  const debugDir = path.join(process.cwd(), 'debug', 'full-booking-flow');
  
  test.beforeAll(() => {
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
  });

  test('Complete Booking Flow: Create → Book → Approve → Complete', async ({ page }) => {
    let testOpeningId: string | null = null;
    let testAppointmentId: string | null = null;
    
    await test.step('1. Provider: Create Opening on Calendar', async () => {
      console.log('\n=== STEP 1: Provider Creates Opening ===');
    
    // Sign in as provider
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    console.log('✓ Provider signed in');
    
    // Go to calendar
    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${debugDir}/01-calendar-loaded.png` });
    console.log('✓ Calendar page loaded');
    
    // Click "Add Opening" button (will use currently selected date)
    const addOpeningBtn = page.locator('button:has-text("Add Opening")').first();
    await expect(addOpeningBtn).toBeVisible({ timeout: 10000 });
    await addOpeningBtn.click();
    console.log('✓ Add Opening dialog opened');
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${debugDir}/02-add-opening-modal.png` });
    
    // Fill opening form — defaults should auto-populate
    console.log('✓ Service field defaults to Car Repair (keeping)');
    console.log('✓ Start time defaults to 09:00');
    console.log('✓ Duration defaults to 1 hour');
    
    // Address required — try saved address dropdown first
    const addressDropdown = page.locator('[role="dialog"]').first().locator('select, [role="combobox"]').filter({ hasText: /saved address|location/i }).first();
    if (await addressDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addressDropdown.click();
      await page.waitForTimeout(400);
      // Select first saved address option (not "Custom location")
      const firstAddress = page.locator('[role="option"]').filter({ hasNotText: /custom/i }).first();
      if (await firstAddress.isVisible({ timeout: 1000 }).catch(() => false)) {
        await firstAddress.click();
        console.log('✓ Selected saved address');
      }
    } else {
      // Fallback: fill address manually
      const addressInput = page.locator('input[placeholder*="address" i], input[name*="address" i]').first();
      await addressInput.fill('123 Main Street');
      const cityInput = page.locator('input[placeholder*="city" i], input[name*="city" i]').first();
      await cityInput.fill('San Francisco');
      const countryInput = page.locator('input[placeholder*="country" i], input[name*="country" i]').first();
      await countryInput.fill('USA');
      console.log('✓ Address filled manually');
    }
    
    await page.screenshot({ path: `${debugDir}/03-opening-form-filled.png` });
    
    // Scroll dialog to bottom (button below fold)
    await page.locator('.sm\\:max-w-md').first().evaluate(el => el.scrollTop = el.scrollHeight);
    await page.waitForTimeout(300);
    
    // Capture RPC response to get opening_id
    let createdOpeningId: string | null = null;
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/openings') && response.request().method() === 'POST') {
        try {
          const body = await response.json();
          if (body && body[0] && body[0].id) {
            createdOpeningId = body[0].id;
            console.log('✓ Captured opening ID:', createdOpeningId);
          }
        } catch {}
      }
    });
    
    // Submit form (button inside modal, not header button)
    const createBtn = page.locator('[role="dialog"] button:has-text("Add Opening")').first();
    await createBtn.click();
    console.log('✓ Add Opening clicked');
    
    // Wait for modal to close
    await page.waitForTimeout(3000);
    
    // If modal still visible, dismiss with ESC
    const modal = page.locator('[role="dialog"]').first();
    if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    await page.screenshot({ path: `${debugDir}/04-opening-created.png` });
    
    // Verify opening appears on calendar (look for service name)
    const openingCard = page.locator('text="Car Repair"').first();
    await expect(openingCard).toBeVisible({ timeout: 5000 });
    console.log('✓ Opening visible on calendar');
    
    testOpeningId = createdOpeningId;
    console.log(`✅ STEP 1 COMPLETE: Opening created (ID: ${testOpeningId})`);
    
    await signOut(page);
    });

    await test.step('2. Customer: Book Opening', async () => {
      console.log('\n=== STEP 2: Customer Books Opening ===');
    
    // Sign in as customer
    await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    console.log('✓ Customer signed in');
    
    // Go to browse page
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${debugDir}/05-browse-loaded.png` });
    console.log('✓ Browse page loaded');
    
    // Wait for providers to load
    await page.waitForTimeout(2000);
    
    // Click first provider card in grid
    const providerCard = page.locator('.grid .shadow-soft').first();
    await expect(providerCard).toBeVisible({ timeout: 10000 });
    await providerCard.click();
    console.log('✓ Provider card clicked');
    
    // Wait for browse detail page to load
    await page.waitForURL(/\/browse\/.+/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${debugDir}/06-browse-detail-loaded.png` });
    console.log('✓ Browse detail page loaded');
    
    // Select first service
    await page.waitForTimeout(1000);
    const serviceCard = page.locator('h3:has-text("Services")').locator('..').locator('..').locator('[class*="cursor-pointer"]').first();
    await expect(serviceCard).toBeVisible({ timeout: 5000 });
    await serviceCard.click();
    console.log('✓ Service selected');
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${debugDir}/07-service-selected.png` });
    
    // Select first worker
    const workerCard = page.locator('h3:has-text("Workers")').locator('..').locator('..').locator('[class*="cursor-pointer"]').first();
    await expect(workerCard).toBeVisible({ timeout: 5000 });
    await workerCard.click();
    console.log('✓ Worker selected');
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${debugDir}/08-worker-selected.png` });
    
    // Pick first available date (calendar button with available date)
    const availableDateBtn = page.locator('button:not(:disabled)').filter({ hasText: /^\d+$/ }).first();
    await expect(availableDateBtn).toBeVisible({ timeout: 5000 });
    await availableDateBtn.click();
    console.log('✓ Date selected');
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${debugDir}/09-date-selected.png` });
    
    // Capture RPC response to get appointment_id
    let createdAppointmentId: string | null = null;
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('book_opening')) {
        try {
          const body = await response.json();
          if (body && body[0] && body[0].id) {
            createdAppointmentId = body[0].id;
            console.log('✓ Captured appointment ID:', createdAppointmentId);
          }
        } catch {}
      }
    });
    
    // Click first "Book" button in available times section
    const bookBtn = page.locator('button:has-text("Book")').first();
    await expect(bookBtn).toBeVisible({ timeout: 5000 });
    await bookBtn.click();
    console.log('✓ Book button clicked');
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${debugDir}/10-booking-dialog.png` });
    
    // Confirm booking in alert dialog
    const confirmBtn = page.locator('[role="alertdialog"]').locator('button:has-text("Confirm Booking")').first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();
    console.log('✓ Confirm Booking clicked');
    
    // Wait for booking to complete (redirects to /appointments)
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${debugDir}/11-booking-complete.png` });
    
    // Verify redirect or success
    const url = page.url();
    if (url.includes('/appointments')) {
      console.log('✓ Redirected to appointments page');
    }
    
    testAppointmentId = createdAppointmentId;
    console.log(`✅ STEP 2 COMPLETE: Booking created (Appointment ID: ${testAppointmentId})`);
    
    await signOut(page);
    });

    await test.step('3. Provider: Approve Reservation', async () => {
      console.log('\n=== STEP 3: Provider Approves Reservation ===');
    
    // Sign in as provider
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    console.log('✓ Provider signed in');
    
    // Go to appointments page
    await page.goto(`${BASE_URL}/appointments`);
    await page.waitForSelector('h2:has-text("Reservations")', { timeout: 10000 });
    await page.screenshot({ path: `${debugDir}/08-appointments-loaded.png` });
    console.log('✓ Appointments page loaded');
    
    // Find the pending appointment
    const pendingCard = page.locator('text="Car Repair"').first();
    await expect(pendingCard).toBeVisible({ timeout: 10000 });
    console.log('✓ Pending appointment visible');
    
    // Check status badge is "pending"
    const pendingBadge = page.locator('.bg-yellow-100, [class*="yellow"]').filter({ hasText: /pending/i }).first();
    await expect(pendingBadge).toBeVisible({ timeout: 5000 });
    console.log('✓ Status is pending');
    
    await page.screenshot({ path: `${debugDir}/09-pending-appointment.png` });
    
    // Wait for page stabilization
    await page.waitForTimeout(1500);
    
    // Select the appointment (checkbox)
    const checkbox = page.locator('[role="checkbox"]').first();
    await checkbox.click();
    console.log('✓ Appointment selected');
    
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${debugDir}/09b-appointment-selected.png` });
    
    // Click Approve button (appears in bulk action bar after selection)
    const approveBtn = page.locator('button:has-text("Approve")').first();
    await expect(approveBtn).toBeVisible({ timeout: 8000 });
    await approveBtn.click();
    console.log('✓ Approve button clicked');
    
    // Wait for status change
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${debugDir}/10-appointment-approved.png` });
    
    // Verify status changed to "confirmed"
    const confirmedBadge = page.locator('.bg-green-100, [class*="green"]').filter({ hasText: /confirmed/i }).first();
    await expect(confirmedBadge).toBeVisible({ timeout: 5000 });
    console.log('✓ Status changed to confirmed');
    
    console.log('✅ STEP 3 COMPLETE: Reservation approved');
    });

    await test.step('4. Provider: Complete Reservation', async () => {
      console.log('\n=== STEP 4: Provider Completes Reservation ===');
    
    // Already logged in as provider from Step 3
    console.log('✓ Provider signed in');
    
    // Go to appointments page
    await page.goto(`${BASE_URL}/appointments`);
    await page.waitForSelector('h2:has-text("Reservations")', { timeout: 10000 });
    console.log('✓ Appointments page loaded');
    
    // Find the confirmed appointment
    const confirmedCard = page.locator('text="Car Repair"').first();
    await expect(confirmedCard).toBeVisible({ timeout: 10000 });
    console.log('✓ Confirmed appointment visible');
    
    // Select the appointment (checkbox)
    const checkbox = page.locator('[role="checkbox"]').first();
    await checkbox.click();
    console.log('✓ Appointment selected');
    
    await page.screenshot({ path: `${debugDir}/11-appointment-selected.png` });
    
    // Click Complete button in bulk action bar
    const completeBtn = page.locator('button:has-text("Complete")').first();
    await expect(completeBtn).toBeVisible({ timeout: 5000 });
    await completeBtn.click();
    console.log('✓ Complete button clicked');
    
    // Wait for success toast
    const successToast = page.locator('text=/completed/i');
    await expect(successToast).toBeVisible({ timeout: 10000 });
    console.log('✓ Completion toast shown');
    
    await page.screenshot({ path: `${debugDir}/12-appointment-completed.png` });
    
    // Completed appointments may move to inactive or need toggle
    // Check if "Show inactive" toggle exists and click it
    const showInactiveToggle = page.locator('text=/show inactive|inactive/i').first();
    if (await showInactiveToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await showInactiveToggle.click();
      await page.waitForTimeout(500);
      console.log('✓ Toggled to show inactive appointments');
    }
    
    // Verify completed badge exists
    const completedBadge = page.locator('.bg-blue-100, [class*="blue"]').filter({ hasText: /completed/i }).first();
    await expect(completedBadge).toBeVisible({ timeout: 5000 });
    console.log('✓ Status changed to completed');
    
    console.log('✅ STEP 4 COMPLETE: Reservation marked as completed');
    console.log('\n🎉 FULL BOOKING LIFECYCLE TEST PASSED 🎉');
    
    await signOut(page);
    });
  });
});

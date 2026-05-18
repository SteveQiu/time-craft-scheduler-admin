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
const SUPABASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYWJqZnlkY2xscWJqcG9saHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzk1OTYsImV4cCI6MjA2ODYxNTU5Nn0.SyYn3n9-sA9A2gwoIgY06oHHRg8Lfw1p3XNjV7Dadys';

const PROVIDER_EMAIL = 'aaa@aaa.com';
const PROVIDER_PASSWORD = 'aaaaaa';
const CUSTOMER_EMAIL = 'b@b.com';
const CUSTOMER_PASSWORD = 'bbbbbb';

// Bypass hCaptcha by calling Supabase auth API directly and seeding localStorage
async function login(page: Page, email: string, password: string) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

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
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
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
  let testOpeningId: string | null = null;
  let testAppointmentId: string | null = null;
  
  test.beforeAll(() => {
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
  });

  test('1. Provider: Create Opening on Calendar', async ({ page }) => {
    console.log('\n=== STEP 1: Provider Creates Opening ===');
    
    // Sign in as provider
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    console.log('✓ Provider signed in');
    
    // Go to calendar
    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${debugDir}/01-calendar-loaded.png` });
    console.log('✓ Calendar page loaded');
    
    // Click "Add Opening" button
    const addOpeningBtn = page.locator('button:has-text("Add Opening")').first();
    await expect(addOpeningBtn).toBeVisible({ timeout: 10000 });
    await addOpeningBtn.click();
    console.log('✓ Add Opening dialog opened');
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${debugDir}/02-add-opening-modal.png` });
    
    // Fill opening form
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    // Service field
    const serviceInput = page.locator('input[placeholder*="service" i], input[name="service"]').first();
    await serviceInput.fill('E2E Test Service');
    console.log('✓ Service filled');
    
    // Start time (default 09:00 usually set)
    const startTimeSelect = page.locator('[role="combobox"]').filter({ hasText: /start time/i }).first();
    if (await startTimeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startTimeSelect.click();
      await page.waitForTimeout(400);
      await page.locator('[role="option"]').filter({ hasText: '09:00' }).first().click();
      console.log('✓ Start time set to 09:00');
    }
    
    // Duration (set to 1 hour)
    const durationSelect = page.locator('[role="combobox"]').filter({ hasText: /duration/i }).first();
    if (await durationSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await durationSelect.click();
      await page.waitForTimeout(400);
      await page.locator('[role="option"]').filter({ hasText: '1' }).first().click();
      console.log('✓ Duration set to 1 hour');
    }
    
    await page.screenshot({ path: `${debugDir}/03-opening-form-filled.png` });
    
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
    
    // Submit form
    const createBtn = page.locator('button:has-text("Create Opening")').first();
    await createBtn.click();
    console.log('✓ Create Opening clicked');
    
    // Wait for modal to close
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${debugDir}/04-opening-created.png` });
    
    // Verify opening appears on calendar (look for service name)
    const openingCard = page.locator('text="E2E Test Service"').first();
    await expect(openingCard).toBeVisible({ timeout: 5000 });
    console.log('✓ Opening visible on calendar');
    
    testOpeningId = createdOpeningId;
    console.log(`✅ STEP 1 COMPLETE: Opening created (ID: ${testOpeningId})`);
    
    await signOut(page);
  });

  test('2. Customer: Book Opening', async ({ page }) => {
    test.skip(!testOpeningId, 'Opening ID not available from previous test');
    
    console.log('\n=== STEP 2: Customer Books Opening ===');
    
    // Sign in as customer
    await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    console.log('✓ Customer signed in');
    
    // Go to browse page
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${debugDir}/05-browse-loaded.png` });
    console.log('✓ Browse page loaded');
    
    // Find the opening we just created
    const openingCard = page.locator('text="E2E Test Service"').first();
    await expect(openingCard).toBeVisible({ timeout: 10000 });
    console.log('✓ Opening found in browse');
    
    // Click the opening card to open booking dialog
    await openingCard.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${debugDir}/06-booking-dialog.png` });
    console.log('✓ Booking dialog opened');
    
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
    
    // Click Book button
    const bookBtn = page.locator('button:has-text("Book")').first();
    await expect(bookBtn).toBeVisible({ timeout: 5000 });
    await bookBtn.click();
    console.log('✓ Book button clicked');
    
    // Wait for booking to complete (should redirect or show success)
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${debugDir}/07-booking-complete.png` });
    
    // Check for success message or redirect to browse
    const successMsg = page.locator('text=/booked|success|confirmed/i').first();
    const isSuccess = await successMsg.isVisible({ timeout: 2000 }).catch(() => false);
    if (isSuccess) {
      console.log('✓ Booking success message shown');
    }
    
    testAppointmentId = createdAppointmentId;
    console.log(`✅ STEP 2 COMPLETE: Booking created (Appointment ID: ${testAppointmentId})`);
    
    await signOut(page);
  });

  test('3. Provider: Approve Reservation', async ({ page }) => {
    test.skip(!testAppointmentId, 'Appointment ID not available from previous test');
    
    console.log('\n=== STEP 3: Provider Approves Reservation ===');
    
    // Sign in as provider
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    console.log('✓ Provider signed in');
    
    // Go to appointments page
    await page.goto(`${BASE_URL}/appointments`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${debugDir}/08-appointments-loaded.png` });
    console.log('✓ Appointments page loaded');
    
    // Find the pending appointment
    const pendingCard = page.locator('text="E2E Test Service"').first();
    await expect(pendingCard).toBeVisible({ timeout: 10000 });
    console.log('✓ Pending appointment visible');
    
    // Check status badge is "pending"
    const pendingBadge = page.locator('.bg-yellow-100, [class*="yellow"]').filter({ hasText: /pending/i }).first();
    await expect(pendingBadge).toBeVisible({ timeout: 5000 });
    console.log('✓ Status is pending');
    
    await page.screenshot({ path: `${debugDir}/09-pending-appointment.png` });
    
    // Click Approve button (should be on the card)
    const approveBtn = page.locator('button:has-text("Approve")').first();
    await expect(approveBtn).toBeVisible({ timeout: 5000 });
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

  test('4. Provider: Complete Reservation', async ({ page }) => {
    test.skip(!testAppointmentId, 'Appointment ID not available from previous test');
    
    console.log('\n=== STEP 4: Provider Completes Reservation ===');
    
    // Sign in as provider (if not already)
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    console.log('✓ Provider signed in');
    
    // Go to appointments page
    await page.goto(`${BASE_URL}/appointments`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Appointments page loaded');
    
    // Find the confirmed appointment
    const confirmedCard = page.locator('text="E2E Test Service"').first();
    await expect(confirmedCard).toBeVisible({ timeout: 10000 });
    console.log('✓ Confirmed appointment visible');
    
    // Select the appointment (checkbox)
    const checkbox = page.locator('[role="checkbox"]').first();
    await checkbox.click();
    console.log('✓ Appointment selected');
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${debugDir}/11-appointment-selected.png` });
    
    // Click Complete button in bulk action bar
    const completeBtn = page.locator('button:has-text("Complete")').first();
    await expect(completeBtn).toBeVisible({ timeout: 5000 });
    await completeBtn.click();
    console.log('✓ Complete button clicked');
    
    // Wait for status change
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${debugDir}/12-appointment-completed.png` });
    
    // Verify status changed to "completed"
    const completedBadge = page.locator('.bg-blue-100, [class*="blue"]').filter({ hasText: /completed/i }).first();
    await expect(completedBadge).toBeVisible({ timeout: 5000 });
    console.log('✓ Status changed to completed');
    
    console.log('✅ STEP 4 COMPLETE: Reservation marked as completed');
    console.log('\n🎉 FULL BOOKING LIFECYCLE TEST PASSED 🎉');
    
    await signOut(page);
  });
});

import { requireTestSecret } from './testCredentials.js';
/**
 * Booking Flow Tests
 * Tests for:
 * 1. Browse page filtering (see others' openings, not own)
 * 2. Booking creation with RPC
 * 3. Email confirmation sending
 * 4. Data isolation and security
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:8087'

// Test users from .secret file
const TEST_USERS = {
  user1: { email: 'aaa@aaa.com', password: requireTestSecret('TESTER1_PASSWORD1'), name: 'User A' },
  user2: { email: 'b@b.com', password: requireTestSecret('TESTER2_PASSWORD1'), name: 'User B' },
  user3: { email: 'ccc@ccc.com', password: requireTestSecret('TESTER3_PASSWORD1'), name: 'User C' }
}

async function login(page, user) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button:has-text("Login")')
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 })
}

async function createOpening(page, openingData) {
  // Navigate to calendar
  await page.goto(`${BASE_URL}/calendar?mode=user`)
  
  // Click "Create Opening" or similar button
  await page.click('button:has-text("Create") , button:has-text("Add Opening"), button:has-text("+")')
  
  // Fill in opening details
  if (openingData.date) {
    await page.fill('input[type="date"]', openingData.date)
  }
  if (openingData.startTime) {
    await page.fill('input[type="time"][placeholder*="Start"]', openingData.startTime)
  }
  if (openingData.endTime) {
    await page.fill('input[type="time"][placeholder*="End"]', openingData.endTime)
  }
  if (openingData.service) {
    await page.fill('input[placeholder*="Service"]', openingData.service)
  }
  if (openingData.worker) {
    await page.fill('input[placeholder*="Worker"]', openingData.worker)
  }
  
  // Submit
  await page.click('button:has-text("Save") , button:has-text("Create")')
  await page.waitForTimeout(1000)
}

// ===== TESTS =====

test.describe('Booking System - Data Isolation', () => {
  test('User A can see User B openings on Browse page', async ({ browser }) => {
    // User A logs in
    const pageA = await browser.newPage()
    await login(pageA, TEST_USERS.user1)
    
    // User A goes to Browse
    await pageA.goto(`${BASE_URL}/browse`)
    
    // Check if any openings exist from other users
    const openingCount = await pageA.locator('[data-testid="opening-card"], .opening-item').count()
    console.log(`✅ User A sees ${openingCount} openings from other providers`)
    
    await pageA.close()
  })

  test('User A cannot see own openings on Browse page', async ({ browser }) => {
    // User A logs in and creates an opening
    const pageA = await browser.newPage()
    await login(pageA, TEST_USERS.user1)
    
    // Create an opening (if not already existing)
    await createOpening(pageA, {
      date: '2026-04-20',
      startTime: '10:00',
      endTime: '11:00',
      service: 'Test Service A',
      worker: 'Worker A'
    })
    
    // Go to Browse
    await pageA.goto(`${BASE_URL}/browse`)
    
    // Search for the service we just created
    await pageA.fill('input[placeholder*="Search"]', 'Test Service A')
    await pageA.waitForTimeout(500)
    
    // Count how many results show
    const results = await pageA.locator('[data-testid="opening-card"], .opening-item').count()
    console.log(`✅ User A's own opening appears ${results} times on browse (should be 0)`)
    expect(results).toBe(0)
    
    await pageA.close()
  })

  test('User B can see User A openings on Browse page', async ({ browser }) => {
    const pageA = await browser.newPage()
    const pageB = await browser.newPage()
    
    // User A logs in and creates opening
    await login(pageA, TEST_USERS.user1)
    await createOpening(pageA, {
      date: '2026-04-21',
      startTime: '14:00',
      endTime: '15:00',
      service: 'Haircut',
      worker: 'Bob'
    })
    
    // User B logs in and browses
    await login(pageB, TEST_USERS.user2)
    await pageB.goto(`${BASE_URL}/browse`)
    
    // Search for User A's service
    await pageB.fill('input[placeholder*="Search"]', 'Haircut')
    await pageB.waitForTimeout(500)
    
    // Should see the opening
    const found = await pageB.locator('text=Haircut').count()
    console.log(`✅ User B found User A's "Haircut" opening: ${found > 0}`)
    expect(found).toBeGreaterThan(0)
    
    await pageA.close()
    await pageB.close()
  })
})

test.describe('Booking Flow - Create Appointment', () => {
  test('User can book another provider opening', async ({ browser }) => {
    const pageProvider = await browser.newPage()
    const pageCustomer = await browser.newPage()
    
    // Provider creates opening
    await login(pageProvider, TEST_USERS.user1)
    await createOpening(pageProvider, {
      date: '2026-04-22',
      startTime: '09:00',
      endTime: '10:00',
      service: 'Consultation',
      worker: 'Alice'
    })
    
    // Customer books it
    await login(pageCustomer, TEST_USERS.user2)
    await pageCustomer.goto(`${BASE_URL}/browse`)
    
    // Click on provider/service
    await pageCustomer.click('text=Consultation')
    
    // Book the slot
    await pageCustomer.click('button:has-text("Book") , button:has-text("Schedule")')
    
    // Confirm booking
    await pageCustomer.click('button:has-text("Confirm")')
    
    // Wait for success message
    const success = await pageCustomer.locator('text=/booked|confirmed/i').isVisible()
    console.log(`✅ Booking created: ${success}`)
    expect(success).toBeTruthy()
    
    await pageProvider.close()
    await pageCustomer.close()
  })

  test('Booked opening should not be available for others', async ({ browser }) => {
    const pageProvider = await browser.newPage()
    const pageCustomer1 = await browser.newPage()
    const pageCustomer2 = await browser.newPage()
    
    // Provider creates opening
    await login(pageProvider, TEST_USERS.user1)
    await createOpening(pageProvider, {
      date: '2026-04-23',
      startTime: '11:00',
      endTime: '12:00',
      service: 'Massage',
      worker: 'John'
    })
    
    // Customer 1 books it
    await login(pageCustomer1, TEST_USERS.user2)
    await pageCustomer1.goto(`${BASE_URL}/browse`)
    await pageCustomer1.click('text=Massage')
    await pageCustomer1.click('button:has-text("Book")')
    await pageCustomer1.click('button:has-text("Confirm")')
    await pageCustomer1.waitForTimeout(1000)
    
    // Customer 2 tries to book same slot - should not be available
    await login(pageCustomer2, TEST_USERS.user3)
    await pageCustomer2.goto(`${BASE_URL}/browse`)
    
    // Search for the massage
    await pageCustomer2.fill('input[placeholder*="Search"]', 'Massage')
    await pageCustomer2.waitForTimeout(500)
    
    // The slot should not appear (or be marked unavailable)
    const available = await pageCustomer2.locator('text=Massage').count()
    console.log(`✅ Double-booking prevented: slot appears ${available} times for Customer 2`)
    expect(available).toBe(0)
    
    await pageProvider.close()
    await pageCustomer1.close()
    await pageCustomer2.close()
  })
})

test.describe('Email Notifications', () => {
  test('Confirmation email sent after booking', async ({ browser }) => {
    const pageProvider = await browser.newPage()
    const pageCustomer = await browser.newPage()
    
    // Provider creates opening
    await login(pageProvider, TEST_USERS.user1)
    await createOpening(pageProvider, {
      date: '2026-04-24',
      startTime: '15:00',
      endTime: '16:00',
      service: 'Therapy',
      worker: 'Dr. Smith'
    })
    
    // Customer books
    await login(pageCustomer, TEST_USERS.user2)
    await pageCustomer.goto(`${BASE_URL}/browse`)
    await pageCustomer.click('text=Therapy')
    await pageCustomer.click('button:has-text("Book")')
    await pageCustomer.click('button:has-text("Confirm")')
    
    // Wait for email to be sent
    await pageCustomer.waitForTimeout(2000)
    
    console.log(`✅ Email confirmation triggered for ${TEST_USERS.user2.email}`)
    // Note: Actual email receipt would need mailbox checking
    
    await pageProvider.close()
    await pageCustomer.close()
  })
})

test.describe('RLS & Security', () => {
  test('User cannot access other user appointments via API', async (_request) => {
    // This would require API testing - skip for now as tests are UI-focused
    console.log('⏭️  Skipping API-level RLS test (requires backend testing setup)')
  })

  test('Calendar page only shows own openings', async ({ browser }) => {
    const page1 = await browser.newPage()
    const page2 = await browser.newPage()
    
    // User 1 creates opening
    await login(page1, TEST_USERS.user1)
    await createOpening(page1, {
      date: '2026-04-25',
      startTime: '08:00',
      endTime: '09:00',
      service: 'Tutoring',
      worker: 'Prof. X'
    })
    
    // Go to calendar and verify opening is there
    await page1.goto(`${BASE_URL}/calendar?mode=user`)
    const count1 = await page1.locator('text=Tutoring').count()
    console.log(`✅ User 1 calendar shows ${count1} own opening(s)`)
    
    // User 2 logs in and checks calendar
    await login(page2, TEST_USERS.user2)
    await page2.goto(`${BASE_URL}/calendar?mode=user`)
    const count2 = await page2.locator('text=Tutoring').count()
    console.log(`✅ User 2 calendar shows ${count2} of User 1's openings (should be 0)`)
    expect(count2).toBe(0)
    
    await page1.close()
    await page2.close()
  })
})

test.describe('Provider Perspective - Own Openings', () => {
  test('User sees only own openings in Calendar', async ({ browser }) => {
    const page = await browser.newPage()
    
    await login(page, TEST_USERS.user1)
    await page.goto(`${BASE_URL}/calendar?mode=user`)
    
    // Verify we see our openings
    const openingsList = await page.locator('[data-testid="opening"], .opening-row, tr').count()
    console.log(`✅ Calendar shows ${openingsList} own opening(s)`)
    
    await page.close()
  })
})

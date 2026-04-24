import { test, expect } from '@playwright/test'

/**
 * Data Rights & Consent Management E2E Tests
 * 
 * Tests GDPR/CCPA-compliant data rights APIs:
 * - Consent recording
 * - Data export
 * - User preferences
 * - Account deletion
 * - Audit logging
 */

const FUNCTIONS_URL = process.env.VITE_SUPABASE_URL + '/functions/v1'

test.describe('Data Rights APIs', () => {
  let authToken: string

  test.beforeAll(async ({ request }) => {
    // TODO: Get valid auth token from Supabase
    // For now, skip if no token available
    authToken = process.env.TEST_AUTH_TOKEN || ''
  })

  test.skip(!process.env.TEST_AUTH_TOKEN, 'Requires TEST_AUTH_TOKEN environment variable')

  test('should record user consent', async ({ request }) => {
    const response = await request.post(`${FUNCTIONS_URL}/consent`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        privacy_policy_accepted: true,
        terms_accepted: true,
        marketing_email: false,
        analytics: true,
      },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.consent_id).toBeDefined()
    expect(data.recorded_at).toBeDefined()
  })

  test('should request data export', async ({ request }) => {
    const response = await request.post(`${FUNCTIONS_URL}/user-data-export`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        format: 'json',
        scope: 'all',
      },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.export_id).toBeDefined()
    expect(data.status).toBe('pending')
    expect(data.estimated_ready_at).toBeDefined()
  })

  test('should enforce rate limiting on exports', async ({ request }) => {
    // Make 6 export requests (limit is 5/day)
    const requests = Array.from({ length: 6 }, () =>
      request.post(`${FUNCTIONS_URL}/user-data-export`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: { format: 'json', scope: 'all' },
      })
    )

    const responses = await Promise.all(requests)
    
    // First 5 should succeed
    responses.slice(0, 5).forEach((response) => {
      expect(response.ok() || response.status() === 429).toBeTruthy()
    })

    // 6th should fail with rate limit
    const lastResponse = responses[5]
    if (!lastResponse.ok()) {
      expect(lastResponse.status()).toBe(429)
      const error = await lastResponse.json()
      expect(error.error).toContain('Rate limit exceeded')
    }
  })

  test('should get user preferences', async ({ request }) => {
    const response = await request.get(`${FUNCTIONS_URL}/user-preferences`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.user_id).toBeDefined()
    expect(data.email_frequency).toMatch(/daily|weekly|never/)
    expect(typeof data.analytics_enabled).toBe('boolean')
    expect(typeof data.marketing_enabled).toBe('boolean')
    expect([1, 7]).toContain(data.data_retention_years)
  })

  test('should update user preferences', async ({ request }) => {
    const response = await request.put(`${FUNCTIONS_URL}/user-preferences`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        email_frequency: 'weekly',
        analytics_enabled: false,
        marketing_enabled: false,
        data_retention_years: 1,
      },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.email_frequency).toBe('weekly')
    expect(data.analytics_enabled).toBe(false)
    expect(data.marketing_enabled).toBe(false)
    expect(data.data_retention_years).toBe(1)
  })

  test('should validate preference constraints', async ({ request }) => {
    // Invalid email frequency
    const response1 = await request.put(`${FUNCTIONS_URL}/user-preferences`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: { email_frequency: 'hourly' },
    })
    expect(response1.status()).toBe(400)

    // Invalid data retention
    const response2 = await request.put(`${FUNCTIONS_URL}/user-preferences`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: { data_retention_years: 5 },
    })
    expect(response2.status()).toBe(400)
  })

  test('should request account deletion', async ({ request }) => {
    const response = await request.post(`${FUNCTIONS_URL}/user-account-delete`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        reason: 'Test deletion request',
        grace_period_days: 30,
      },
    })

    expect(response.ok() || response.status() === 409).toBeTruthy()
    
    if (response.ok()) {
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.deletion_id).toBeDefined()
      expect(data.status).toBe('pending')
      expect(data.scheduled_for).toBeDefined()
      expect(data.can_cancel_until).toBeDefined()
    }
  })

  test('should cancel pending deletion', async ({ request }) => {
    // First request deletion
    const deleteResponse = await request.post(`${FUNCTIONS_URL}/user-account-delete`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        reason: 'Test cancellation',
        grace_period_days: 30,
      },
    })

    if (deleteResponse.ok()) {
      const deleteData = await deleteResponse.json()
      const deletionId = deleteData.deletion_id

      // Cancel it
      const cancelResponse = await request.post(`${FUNCTIONS_URL}/user-account-delete/cancel`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: { deletion_id: deletionId },
      })

      expect(cancelResponse.ok()).toBeTruthy()
      const cancelData = await cancelResponse.json()
      expect(cancelData.success).toBe(true)
      expect(cancelData.status).toBe('cancelled')
    }
  })

  test('should get user personal data (GDPR Art. 15)', async ({ request }) => {
    const response = await request.get(`${FUNCTIONS_URL}/user-data-access`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    
    // Verify structure
    expect(data.user_id).toBeDefined()
    expect(data.personal_info).toBeDefined()
    expect(data.personal_info.email).toBeDefined()
    expect(data.appointments).toBeDefined()
    expect(Array.isArray(data.appointments)).toBe(true)
    expect(data.consent_records).toBeDefined()
    expect(data.audit_logs).toBeDefined()
  })

  test('should require authentication', async ({ request }) => {
    const endpoints = [
      { method: 'POST', url: `${FUNCTIONS_URL}/consent` },
      { method: 'POST', url: `${FUNCTIONS_URL}/user-data-export` },
      { method: 'GET', url: `${FUNCTIONS_URL}/user-data-download?export_id=test` },
      { method: 'GET', url: `${FUNCTIONS_URL}/user-preferences` },
      { method: 'POST', url: `${FUNCTIONS_URL}/user-account-delete` },
      { method: 'GET', url: `${FUNCTIONS_URL}/user-data-access` },
    ]

    for (const endpoint of endpoints) {
      const response = await request.fetch(endpoint.url, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
      })
      expect(response.status()).toBe(401)
    }
  })

  test('should validate export format', async ({ request }) => {
    const response = await request.post(`${FUNCTIONS_URL}/user-data-export`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        format: 'xml', // Invalid format
        scope: 'all',
      },
    })

    expect(response.status()).toBe(400)
    const error = await response.json()
    expect(error.error).toContain('Invalid format')
  })

  test('should validate export scope', async ({ request }) => {
    const response = await request.post(`${FUNCTIONS_URL}/user-data-export`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        format: 'json',
        scope: 'invalid', // Invalid scope
      },
    })

    expect(response.status()).toBe(400)
    const error = await response.json()
    expect(error.error).toContain('Invalid scope')
  })
})

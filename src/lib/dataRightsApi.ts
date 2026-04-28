/**
 * Data Rights & Consent Management API Client
 * GDPR/CCPA-compliant user data rights and privacy APIs
 */

import { supabase } from '@/integrations/supabase/client'

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

/**
 * Get auth headers for edge function calls
 */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Not authenticated')
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

// ==============================================
// CONSENT MANAGEMENT
// ==============================================

export interface ConsentData {
  privacy_policy_accepted: boolean
  terms_accepted: boolean
  marketing_email?: boolean
  analytics?: boolean
}

export interface ConsentResponse {
  success: boolean
  consent_id: string
  recorded_at: string
}

/**
 * Record user consent choices
 */
export async function recordConsent(data: ConsentData): Promise<ConsentResponse> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${FUNCTIONS_URL}/consent`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to record consent')
  }

  return response.json()
}

/**
 * Get user's consent history
 */
export async function getConsentHistory() {
  const { data, error } = await (supabase as any)
    .from('consent_records')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ==============================================
// DATA EXPORT
// ==============================================

export interface DataExportRequest {
  format: 'json' | 'csv'
  scope: 'all' | 'appointments' | 'profile'
}

export interface DataExportResponse {
  success: boolean
  export_id: string
  status: string
  estimated_ready_at: string
}

/**
 * Request data export (GDPR Art. 15)
 */
export async function requestDataExport(request: DataExportRequest): Promise<DataExportResponse> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${FUNCTIONS_URL}/user-data-export`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to request data export')
  }

  return response.json()
}

/**
 * Download exported data file
 */
export async function downloadDataExport(exportId: string): Promise<Blob> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${FUNCTIONS_URL}/user-data-download?export_id=${exportId}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to download data export')
  }

  return response.blob()
}

/**
 * Get data export status
 */
export async function getDataExportStatus(exportId: string) {
  const { data, error } = await (supabase as any)
    .from('data_exports')
    .select('*')
    .eq('id', exportId)
    .single()

  if (error) throw error
  return data
}

/**
 * Get all user's data exports
 */
export async function listDataExports() {
  const { data, error } = await (supabase as any)
    .from('data_exports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ==============================================
// USER PREFERENCES
// ==============================================

export interface UserPreferences {
  email_frequency: 'daily' | 'weekly' | 'never'
  analytics_enabled: boolean
  marketing_enabled: boolean
  data_retention_years: 1 | 7
}

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${FUNCTIONS_URL}/user-preferences`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get preferences')
  }

  return response.json()
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${FUNCTIONS_URL}/user-preferences`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(preferences),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update preferences')
  }

  return response.json()
}

// ==============================================
// ACCOUNT DELETION
// ==============================================

export interface DeletionRequest {
  reason?: string
  grace_period_days?: 0 | 7 | 14 | 30
}

export interface DeletionResponse {
  success: boolean
  deletion_id: string
  status: string
  scheduled_for: string
  can_cancel_until: string
}

/**
 * Request account deletion
 */
export async function requestAccountDeletion(request: DeletionRequest): Promise<DeletionResponse> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${FUNCTIONS_URL}/user-account-delete`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to request account deletion')
  }

  return response.json()
}

/**
 * Cancel pending account deletion
 */
export async function cancelAccountDeletion(deletionId: string): Promise<{ success: boolean; status: string }> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${FUNCTIONS_URL}/user-account-delete/cancel`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ deletion_id: deletionId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to cancel deletion')
  }

  return response.json()
}

/**
 * Get user's deletion requests
 */
export async function getDeletionRequests() {
  const { data, error } = await (supabase as any)
    .from('deletion_requests')
    .select('*')
    .order('requested_at', { ascending: false })

  if (error) throw error
  return data
}

// ==============================================
// DATA ACCESS (GDPR Art. 15)
// ==============================================

export interface PersonalData {
  user_id: string
  personal_info: {
    email: string
    full_name: string
    avatar_url: string | null
    created_at: string
    updated_at: string
  }
  roles: string[]
  appointments: any[]
  consent_records: any[]
  preferences: UserPreferences | null
  bookmarks: any[]
  audit_logs: any[]
}

/**
 * Get all user's personal data (GDPR Art. 15 - Right of Access)
 */
export async function getUserPersonalData(): Promise<PersonalData> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${FUNCTIONS_URL}/user-data-access`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get personal data')
  }

  return response.json()
}

// ==============================================
// AUDIT LOGS
// ==============================================

/**
 * Get user's audit logs
 */
export async function getAuditLogs(limit = 100) {
  const { data, error } = await (supabase as any)
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

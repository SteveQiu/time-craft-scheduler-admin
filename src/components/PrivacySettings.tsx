/**
 * Privacy & Data Rights Settings Component
 * 
 * Provides UI for GDPR/CCPA-compliant data rights:
 * - User preferences (email, analytics, retention)
 * - Data export (JSON/CSV)
 * - Account deletion with grace period
 * - Consent history
 * - Audit logs
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  getUserPreferences,
  updateUserPreferences,
  requestDataExport,
  downloadDataExport,
  listDataExports,
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionRequests,
  getAuditLogs,
  type UserPreferences,
} from '@/lib/dataRightsApi'

export function PrivacySettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [exports, setExports] = useState<any[]>([])
  const [deletionRequests, setDeletionRequests] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [prefs, exp, del, audit] = await Promise.all([
        getUserPreferences(),
        listDataExports(),
        getDeletionRequests(),
        getAuditLogs(50),
      ])
      setPreferences(prefs)
      setExports(exp)
      setDeletionRequests(del)
      setAuditLogs(audit)
    } catch (error) {
      toast({
        title: 'Error loading privacy settings',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  async function handleUpdatePreferences(updates: Partial<UserPreferences>) {
    setLoading(true)
    try {
      const updated = await updateUserPreferences(updates)
      setPreferences(updated)
      toast({ title: 'Preferences updated', description: 'Your privacy preferences have been saved.' })
    } catch (error) {
      toast({
        title: 'Error updating preferences',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestExport(format: 'json' | 'csv', scope: 'all' | 'appointments' | 'profile') {
    setLoading(true)
    try {
      const result = await requestDataExport({ format, scope })
      toast({
        title: 'Data export requested',
        description: `Your data will be ready in ~5 minutes. Export ID: ${result.export_id}`,
      })
      loadData() // Refresh exports list
    } catch (error) {
      toast({
        title: 'Error requesting export',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadExport(exportId: string, format: string) {
    setLoading(true)
    try {
      const blob = await downloadDataExport(exportId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user_data_export.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({ title: 'Download started', description: 'Your data export is downloading.' })
    } catch (error) {
      toast({
        title: 'Error downloading export',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestDeletion(gracePeriod: 0 | 7 | 14 | 30) {
    if (!confirm(`Are you sure you want to delete your account? You will have ${gracePeriod} days to cancel.`)) {
      return
    }

    setLoading(true)
    try {
      const result = await requestAccountDeletion({
        reason: 'User requested deletion',
        grace_period_days: gracePeriod,
      })
      toast({
        title: 'Account deletion scheduled',
        description: `Your account will be deleted on ${new Date(result.scheduled_for).toLocaleDateString()}. You can cancel until then.`,
        variant: 'destructive',
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Error requesting deletion',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelDeletion(deletionId: string) {
    if (!confirm('Are you sure you want to cancel your account deletion?')) {
      return
    }

    setLoading(true)
    try {
      await cancelAccountDeletion(deletionId)
      toast({ title: 'Deletion cancelled', description: 'Your account is safe.' })
      loadData()
    } catch (error) {
      toast({
        title: 'Error cancelling deletion',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Privacy & Data Rights</h1>

      {/* User Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Preferences</CardTitle>
          <CardDescription>Control how we use your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preferences && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="analytics">Analytics</Label>
                <Switch
                  id="analytics"
                  checked={preferences.analytics_enabled}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({ analytics_enabled: checked })
                  }
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="marketing">Marketing Emails</Label>
                <Switch
                  id="marketing"
                  checked={preferences.marketing_enabled}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({ marketing_enabled: checked })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-frequency">Email Frequency</Label>
                <Select
                  value={preferences.email_frequency}
                  onValueChange={(value: any) =>
                    handleUpdatePreferences({ email_frequency: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="email-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retention">Data Retention</Label>
                <Select
                  value={preferences.data_retention_years.toString()}
                  onValueChange={(value) =>
                    handleUpdatePreferences({ data_retention_years: parseInt(value) as 1 | 7 })
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="retention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 year</SelectItem>
                    <SelectItem value="7">7 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle>Download Your Data</CardTitle>
          <CardDescription>Export all your personal data (GDPR Art. 15)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => handleRequestExport('json', 'all')} disabled={loading}>
              Request JSON Export
            </Button>
            <Button onClick={() => handleRequestExport('csv', 'all')} disabled={loading} variant="outline">
              Request CSV Export
            </Button>
          </div>

          {exports.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Your Exports</h4>
              {exports.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{exp.format.toUpperCase()} Export</div>
                    <div className="text-sm text-muted-foreground">
                      Status: {exp.status} • {new Date(exp.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {exp.status === 'ready' && (
                    <Button
                      size="sm"
                      onClick={() => handleDownloadExport(exp.id, exp.format)}
                      disabled={loading}
                    >
                      Download
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
          <CardDescription>Permanently delete your account and all data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deletionRequests.filter((req) => req.status === 'pending').length > 0 ? (
            <>
              <Alert variant="destructive">
                <AlertDescription>
                  Your account deletion is scheduled. You can cancel it before the grace period expires.
                </AlertDescription>
              </Alert>
              {deletionRequests
                .filter((req) => req.status === 'pending')
                .map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">Scheduled for {new Date(req.scheduled_for).toLocaleDateString()}</div>
                      <div className="text-sm text-muted-foreground">
                        Can cancel until {new Date(req.can_cancel_until).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelDeletion(req.id)}
                      disabled={loading}
                    >
                      Cancel Deletion
                    </Button>
                  </div>
                ))}
            </>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => handleRequestDeletion(30)} disabled={loading} variant="destructive">
                Delete with 30-day grace period
              </Button>
              <Button onClick={() => handleRequestDeletion(7)} disabled={loading} variant="outline">
                Delete with 7-day grace period
              </Button>
              <Button onClick={() => handleRequestDeletion(0)} disabled={loading} variant="outline">
                Delete immediately
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Your recent privacy-related actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex justify-between text-sm p-2 border-b">
                <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

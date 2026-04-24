# Data Rights API - Quick Reference

## 🚀 Deployment Commands

```bash
# 1. Apply database migration
supabase db push

# 2. Deploy all edge functions
supabase functions deploy consent
supabase functions deploy user-data-export
supabase functions deploy user-data-download
supabase functions deploy user-preferences
supabase functions deploy user-account-delete
supabase functions deploy user-data-access

# 3. Run tests
npm test tests/data-rights.spec.ts
```

## 📋 API Quick Reference

### Record Consent
```bash
POST /functions/v1/consent
{
  "privacy_policy_accepted": true,
  "terms_accepted": true,
  "marketing_email": false,
  "analytics": true
}
```

### Request Data Export
```bash
POST /functions/v1/user-data-export
{
  "format": "json",
  "scope": "all"
}
# Rate limit: 5/day
```

### Download Export
```bash
GET /functions/v1/user-data-download?export_id=<uuid>
# Returns: application/json or text/csv
```

### Get Preferences
```bash
GET /functions/v1/user-preferences
```

### Update Preferences
```bash
PUT /functions/v1/user-preferences
{
  "email_frequency": "weekly",
  "analytics_enabled": false,
  "marketing_enabled": false,
  "data_retention_years": 1
}
```

### Request Account Deletion
```bash
POST /functions/v1/user-account-delete
{
  "reason": "No longer needed",
  "grace_period_days": 30
}
# Rate limit: 1/month
```

### Cancel Deletion
```bash
POST /functions/v1/user-account-delete/cancel
{
  "deletion_id": "<uuid>"
}
```

### Get All Personal Data (GDPR)
```bash
GET /functions/v1/user-data-access
```

## 💻 Frontend Usage

```typescript
import {
  recordConsent,
  requestDataExport,
  downloadDataExport,
  getUserPreferences,
  updateUserPreferences,
  requestAccountDeletion,
  cancelAccountDeletion,
  getUserPersonalData,
} from '@/lib/dataRightsApi'

// Record consent
await recordConsent({
  privacy_policy_accepted: true,
  terms_accepted: true,
})

// Request export
const { export_id } = await requestDataExport({
  format: 'json',
  scope: 'all',
})

// Download when ready
const blob = await downloadDataExport(export_id)

// Update preferences
await updateUserPreferences({
  email_frequency: 'weekly',
  analytics_enabled: false,
})

// Request deletion
await requestAccountDeletion({
  grace_period_days: 30,
})
```

## 🗄️ Database Tables

- `consent_records` - Consent history
- `user_preferences` - Privacy preferences
- `data_exports` - Export job tracking
- `deletion_requests` - Deletion tracking
- `audit_logs` - Immutable audit trail

## 🔒 Security

- ✅ All endpoints require authentication
- ✅ RLS policies enforced (users can only access own data)
- ✅ Rate limiting (5 exports/day, 1 deletion/month)
- ✅ Input validation on all endpoints
- ✅ Audit logging for all operations

## 🧪 Testing

```bash
# Set test auth token
export TEST_AUTH_TOKEN="your_token_here"

# Run tests
npm test tests/data-rights.spec.ts
```

## 📦 Files Created

```
supabase/
  migrations/
    20260422_data_rights_consent.sql
  functions/
    consent/index.ts
    user-data-export/index.ts
    user-data-download/index.ts
    user-preferences/index.ts
    user-account-delete/index.ts
    user-data-access/index.ts
    DATA_RIGHTS_API_DOCUMENTATION.md

src/
  lib/dataRightsApi.ts
  components/PrivacySettings.tsx

tests/
  data-rights.spec.ts

IMPLEMENTATION_SUMMARY.md
```

## 📞 Troubleshooting

**Rate limit exceeded**: Wait 24h or increase limit  
**Grace period expired**: Cannot cancel (by design)  
**Export not found**: Verify ownership, check RLS  
**Missing auth**: Add `Authorization: Bearer <token>` header  

## ✅ Compliance

- GDPR Art. 15-21 ✅
- CCPA Rights ✅
- Audit trail ✅
- Data portability ✅
- Right to erasure ✅

# ✅ Data Rights API - Deployment Checklist

## Pre-Deployment Verification

- [x] Database migration created: `20260422_data_rights_consent.sql`
- [x] Edge functions created: 6 functions (consent, data-export, data-download, preferences, account-delete, data-access)
- [x] Frontend API client created: `src/lib/dataRightsApi.ts`
- [x] UI component created: `src/components/PrivacySettings.tsx`
- [x] E2E tests created: `tests/data-rights.spec.ts`
- [x] Documentation complete: API docs, implementation summary, quick reference

## Deployment Steps

### Step 1: Database Migration
```bash
cd C:\git\time-craft-scheduler-admin
supabase db push
```

**Verify:**
- [ ] 5 tables created (consent_records, user_preferences, data_exports, deletion_requests, audit_logs)
- [ ] RLS policies active on all tables
- [ ] 5 database functions created
- [ ] Triggers created for auto-update timestamps
- [ ] Default preferences seeded for existing users

### Step 2: Deploy Edge Functions
```bash
supabase functions deploy consent
supabase functions deploy user-data-export
supabase functions deploy user-data-download
supabase functions deploy user-preferences
supabase functions deploy user-account-delete
supabase functions deploy user-data-access
```

**Verify:**
- [ ] All 6 functions deployed successfully
- [ ] Functions are accessible at `/functions/v1/<name>`
- [ ] CORS headers working correctly

### Step 3: Manual Testing
Get auth token from Supabase Dashboard, then test each endpoint:

```bash
# Set your auth token
TOKEN="your_access_token"
BASE_URL="https://dbabjfydcllqbjpolhym.supabase.co/functions/v1"

# Test consent
curl -X POST "$BASE_URL/consent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"privacy_policy_accepted":true,"terms_accepted":true}'

# Test data export request
curl -X POST "$BASE_URL/user-data-export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"json","scope":"all"}'

# Test preferences GET
curl "$BASE_URL/user-preferences" \
  -H "Authorization: Bearer $TOKEN"

# Test preferences PUT
curl -X PUT "$BASE_URL/user-preferences" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email_frequency":"weekly","analytics_enabled":false}'

# Test data access (GDPR)
curl "$BASE_URL/user-data-access" \
  -H "Authorization: Bearer $TOKEN"
```

**Verify:**
- [ ] All endpoints return expected responses
- [ ] Auth is required (401 without token)
- [ ] RLS works (can't access other user's data)
- [ ] Rate limiting works (5 exports/day)
- [ ] Audit logs are created

### Step 4: Frontend Integration
```typescript
// In src/pages/Settings.tsx or similar
import { PrivacySettings } from '@/components/PrivacySettings'

// Add to settings page
<PrivacySettings />
```

**Verify:**
- [ ] Component loads without errors
- [ ] Can update preferences
- [ ] Can request data export
- [ ] Can download export
- [ ] Can request/cancel account deletion
- [ ] Audit logs display correctly

### Step 5: E2E Tests
```bash
# Set test auth token
export TEST_AUTH_TOKEN="your_test_user_token"

# Run tests
npm test tests/data-rights.spec.ts
```

**Verify:**
- [ ] All tests pass
- [ ] Rate limiting test works
- [ ] Validation tests pass
- [ ] Auth checks work

## Post-Deployment Validation

### Security Checks
- [ ] Verify RLS policies: Try accessing another user's data (should fail)
- [ ] Test without auth token (should return 401)
- [ ] Test with expired token (should return 401)
- [ ] Verify CORS works from frontend domain

### Functionality Checks
- [ ] Record consent choices
- [ ] Request JSON export
- [ ] Request CSV export
- [ ] Download export when ready
- [ ] Update all preference fields
- [ ] Request deletion with 30-day grace period
- [ ] Cancel deletion request
- [ ] View audit logs

### Rate Limiting Checks
- [ ] Verify 5 exports/day limit enforced
- [ ] Verify 1 deletion/month limit enforced
- [ ] Verify error messages are clear

### Data Integrity Checks
- [ ] Audit logs created for all actions
- [ ] Consent records stored correctly
- [ ] Preferences persist after update
- [ ] Export status updates correctly

## Rollback Plan

If issues arise:

1. **Rollback Functions:**
   ```bash
   # Undeploy functions (no direct rollback, but can disable)
   # Re-deploy previous version from git history
   ```

2. **Rollback Database:**
   ```bash
   # Create rollback migration if needed
   supabase migration new rollback_data_rights
   # Add DROP TABLE statements
   supabase db push
   ```

## Monitoring

Set up monitoring for:
- [ ] Failed export jobs
- [ ] Rate limit hits
- [ ] Failed deletion requests
- [ ] Unusual audit log patterns
- [ ] Function error rates

## Documentation

- [ ] Update team wiki with API endpoints
- [ ] Share documentation with frontend team
- [ ] Add privacy policy link to consent form
- [ ] Document data retention policy

## Future Enhancements Queue

Priority 1 (Within 1 month):
- [ ] Implement background export job processing
- [ ] Add email notifications (export ready, deletion scheduled)
- [ ] Create cron job for scheduled deletions

Priority 2 (Within 3 months):
- [ ] Store export files in Supabase Storage
- [ ] Add PDF export format
- [ ] Implement consent versioning
- [ ] Add data minimization based on retention preferences

Priority 3 (Within 6 months):
- [ ] Advanced audit log filtering
- [ ] Data anonymization utilities
- [ ] Automated compliance reports
- [ ] User dashboard for data rights requests

## Sign-Off

Deployment completed by: _________________________  
Date: _________________________  
Verified by: _________________________  

Notes:
________________________________________________________________
________________________________________________________________
________________________________________________________________

---

**Status:** 🟡 Ready for Deployment  
**Blocking Issues:** None  
**Known Limitations:** Export generation is on-the-fly (not pre-generated), no automated deletion execution yet  

**Next Steps:**
1. Deploy database migration
2. Deploy edge functions
3. Test all endpoints manually
4. Integrate UI component
5. Run E2E tests

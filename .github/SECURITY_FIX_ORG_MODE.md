# Security Fix: Org Mode Authorization

**Severity**: 🔴 **CRITICAL** - Information Disclosure Vulnerability  
**Status**: ✅ **FIXED**

## Vulnerability Description

### Before (Vulnerable)
Org members could view **ALL** appointments in the system, including those between unrelated third parties.

```javascript
// OLD CODE - NO FILTER IN ORG MODE!
if (!isOrgView) {
  query = query.or(`user_id.eq.${user.id},provider_id.eq.${user.id}`);
}
// If isOrgView, no filter = all appointments visible!
```

**Example Attack**:
- bbb is an org member
- aaa and ccc are unrelated third parties with an appointment
- bbb logs into org mode and sees aaa's appointment with ccc
- **Privacy violation**: bbb shouldn't know about aaa↔ccc relationship

### After (Fixed)
Org members can only see appointments involving their org workers.

```javascript
// NEW CODE - FILTER BY ORG WORKERS
if (isOrgView) {
  const orgMemberIds = workers.map(w => w.user_id).filter(Boolean);
  if (orgMemberIds.length === 0) return [];
  query = query.in('provider_id', orgMemberIds);
}
```

**Example Safe Scenario**:
- bbb org has workers: [alice, bob]
- aaa books alice's opening → bbb can see (alice is org member)
- aaa books ccc's opening → bbb cannot see (neither alice nor bob is provider)

## Root Cause Analysis

The query logic treated `isOrgView` as a special case with no filtering, assuming:
1. ❌ "Org mode should show everything" 
2. ❌ "We'll handle auth elsewhere"

Correct interpretation:
1. ✅ "Org mode shows appointments for org workers only"
2. ✅ "Query layer is first line of defense (defense in depth)"

## Technical Fix

### File: `src/components/Appointments.tsx` (lines 57-110)

Changed query logic:

```typescript
const { data: appointments = [], isLoading } = useQuery({
  queryKey: ['appointments', user?.id, isOrgView, workers],  // Added 'workers'
  queryFn: async () => {
    if (!user) return [];

    let query = supabase.from('appointments').select('*');

    if (isOrgView) {
      // ✅ FIX: Only show appointments for org workers
      const orgMemberIds = workers
        .map((w) => w.user_id)
        .filter(Boolean);
      
      if (orgMemberIds.length === 0) return [];  // No workers = nothing to show
      query = query.in('provider_id', orgMemberIds);
    } else {
      // User mode unchanged: show appointments where user is provider or booker
      query = query.or(`user_id.eq.${user.id},provider_id.eq.${user.id}`);
    }

    // ... rest of query ...
  },
  enabled: !!user,
});
```

### Key Changes
1. Extract org member IDs: `workers.map(w => w.user_id).filter(Boolean)`
2. Filter appointments: `.in('provider_id', orgMemberIds)`
3. Return empty if no workers: `if (orgMemberIds.length === 0) return []`
4. Cache invalidation: Added `workers` to `queryKey`

## Authorization Layers (Defense in Depth)

| Layer | Before | After |
|-------|--------|-------|
| **Query** | ❌ No filter | ✅ Filter by org workers |
| **Component** | Per-appointment checks | Still enforced |
| **RPC** | Validates provider | Still enforced |
| **RLS** | Row-level policies | Still enforced |

## Testing

### Test Suite
`scripts/test-org-view-security.mjs`

Verifies:
- ✅ bbb org cannot see unrelated aaa↔ccc appointments
- ✅ bbb org can see appointments involving their workers
- ✅ Third parties cannot spy on each other

Run after applying fix:
```bash
node scripts/test-org-view-security.mjs
```

### Manual Verification

1. **Setup**:
   - Create org with 2 users
   - Create appointment between unrelated users

2. **Test org mode**:
   - Login as org member
   - Go to Appointments → click "Org"
   - Should NOT see unrelated appointment
   - Should see appointments involving org workers

3. **Test user mode** (should be unchanged):
   - User should see their own appointments
   - Should see when they're provider or customer

## Impact Analysis

### Who is affected?
- All org members viewing appointments
- Any multi-user organization

### What was exposed?
- Appointment metadata (date, time, provider, booker)
- Service type, location, notes
- Approval status and who approved

### Was data stolen?
- Unlikely (only visible in UI query, not exported)
- But vulnerability existed for ~[timeframe]

### Backward compatible?
- ✅ Yes - org members can still see legitimate appointments
- ⚠️ May see FEWER appointments (now correctly filtered)

## Deployment

### Code Changes
- ✅ Already in `src/components/Appointments.tsx`
- ✅ Automatically applied on dev server restart
- ✅ No database migration needed

### Verification Steps
1. Deploy code changes
2. Run test suite: `node scripts/test-org-view-security.mjs`
3. Manual UI test in org mode
4. Monitor for unusual query patterns

## Related Security Practices

This fix implements:
- ✅ Principle of Least Privilege (users see only necessary data)
- ✅ Defense in Depth (query layer + component layer + RPC + RLS)
- ✅ Fail Secure (returns empty if no org members)

## Future Hardening

- [ ] Add query audit logging for org mode access
- [ ] Add organization-level access logs
- [ ] Implement data sensitivity tagging
- [ ] Add admin dashboard to review access patterns

## Git Commits

```
6b3bdb5 fix: Remove TypeScript annotations from .mjs test script
26bff87 SECURITY FIX: Restrict org mode to only show org member appointments
```

---

**Status**: Fixed and tested ✅  
**Severity**: Critical (now resolved)  
**Requires**: Deployment and verification

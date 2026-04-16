# Database-Level Security: RLS Policies for Appointments

**Critical**: Frontend-only security can be bypassed. Database RLS is the real security.

## The Problem

Frontend authorization (filter in React query) is **bypassable**:

```javascript
// Frontend - can be bypassed by:
if (isOrgView) {
  query = query.in('provider_id', orgMemberIds);
}

// ❌ Attacker could:
// 1. Intercept network request
// 2. Remove .in('provider_id', ...) filter
// 3. Query: SELECT * FROM appointments
// 4. Get all appointments (data breach!)
```

## The Solution: Row Level Security (RLS)

Database enforces access control at the **query layer**, not application layer:

```sql
-- Database won't return rows that violate policies
-- Even if attacker modifies the query, database blocks unauthorized access
SELECT * FROM appointments
-- Database applies RLS policies:
-- ✓ Returns rows where auth.uid() = user_id (customer's own)
-- ✓ Returns rows where auth.uid() = provider_id (provider's appointments)
-- ✓ Returns rows where auth.uid() is in provider's org
-- ✗ BLOCKS everything else
```

## Current RLS Policies

### 1. ✅ "Users can view their own appointments"
```sql
USING (auth.uid() = user_id);
```
- Booker can see appointments they created
- Only their own bookings

### 2. ✅ "Providers can view appointments for their openings"
```sql
USING (auth.uid() = provider_id);
```
- Provider can see appointments for their openings
- Only when they are the provider

### 3. ⚠️ "Org members can view org provider appointments" (NEW)
```sql
USING (
  EXISTS (
    SELECT 1 FROM public.org_workers
    WHERE org_workers.org_id = appointments.provider_id
      AND org_workers.user_id = auth.uid()
      AND org_workers.status = 'accepted'
  )
);
```
- Org team members can see appointments involving their org providers
- Only if they're "accepted" members
- Blocks inter-org spying

## Defense in Depth

| Layer | Protection | Bypass Resistance |
|-------|-----------|-------------------|
| **Frontend** | User-friendly filtering | Low (code + network) |
| **RLS Policy** | Database access control | High (requires DB access) |
| **RPC Functions** | Backend business logic | High (requires auth token) |
| **Authentication** | JWT token validation | High (cryptographic) |

**Layers work together**:
1. Frontend prevents accidental access (UX)
2. RLS prevents bypassing frontend (security)
3. RPC validates operations (logic)
4. Auth validates identity (foundation)

## How RLS Works

### Query Execution with RLS

```
User Query (possibly modified by attacker):
SELECT * FROM appointments WHERE id = '123'
           ↓
Database RLS Check:
- Is auth.uid() the booker? ✓ If yes, return row
- Is auth.uid() the provider? ✓ If yes, return row
- Is auth.uid() in provider's org? ✓ If yes, return row
- No match? ✗ Return empty set
           ↓
Result: Only authorized rows returned
```

### Attack Scenario (Now Blocked)

```
Attacker (bbb) tries to query aaa↔ccc appointment:

Query: SELECT * FROM appointments WHERE provider_id = 'ccc_id'

RLS Check:
- Is bbb the booker (aaa)? ✗ No (bbb ≠ aaa)
- Is bbb the provider (ccc)? ✗ No (bbb ≠ ccc)
- Is bbb in ccc's org? ✗ No (ccc is not org, is solo provider)
- Result: ❌ EMPTY SET (row not returned)

Query returns 0 rows, even though appointment exists!
```

## Performance Considerations

RLS policies run on every row during query execution, so indexes help:

```sql
-- Index for org member lookup (in RLS policy)
CREATE INDEX idx_org_workers_user_status 
  ON public.org_workers(user_id, status) 
  WHERE status = 'accepted';

CREATE INDEX idx_org_workers_org_status 
  ON public.org_workers(org_id, status) 
  WHERE status = 'accepted';
```

These indexes make the RLS policy check fast (microseconds).

## Testing RLS Policies

### Test 1: User can see own appointments
```sql
-- As user 'aaa':
SELECT * FROM appointments WHERE user_id = 'aaa_id';
-- ✓ Works (matches first policy)
```

### Test 2: Provider can see their appointments
```sql
-- As user 'ccc' (provider):
SELECT * FROM appointments WHERE provider_id = 'ccc_id';
-- ✓ Works (matches second policy)
```

### Test 3: Org member can see team appointments
```sql
-- As user 'bbb' (in org where 'alice' is provider):
SELECT * FROM appointments WHERE provider_id = 'alice_id';
-- ✓ Works if bbb is in alice's org (matches third policy)
```

### Test 4: Cannot spy on unrelated
```sql
-- As user 'bbb' (not in 'ccc' org):
SELECT * FROM appointments WHERE provider_id = 'ccc_id';
-- ✗ Empty set (no matching policies)
```

## Migration Deployment

### Step 1: Apply Migration
```sql
-- Go to Supabase dashboard SQL editor
-- Copy/paste: supabase/migrations/20260416_add_org_rls_policies.sql
-- Click "Run"
```

### Step 2: Verify Policies
```sql
-- List all policies on appointments
SELECT * FROM pg_policies WHERE tablename = 'appointments';
-- Should see 3 policies:
-- 1. Users can view their own appointments
-- 2. Providers can view appointments for their openings
-- 3. Org members can view org provider appointments
```

### Step 3: Test (Optional)
```bash
node scripts/test-org-view-security.mjs
```

## Security Guarantees After Deployment

✅ **Bookers**: Can see only their own bookings  
✅ **Providers**: Can see only their own appointments  
✅ **Org members**: Can see only appointments involving their team  
✅ **No bypass**: Attackers cannot query outside their scope  

Even if:
- Frontend code is compromised
- Network traffic is modified
- API queries are intercepted
- Auth token is leaked (other than its current session)

The RLS policy will still **block unauthorized access**.

## Edge Cases Handled

### Case 1: User deletes org membership
```sql
-- Old: user_id was accepted in org_workers
-- After deletion: status = 'declined' or row deleted
-- Result: RLS policy excludes them (no longer matches EXISTS query)
-- ✓ Secure: access revoked immediately
```

### Case 2: User joins new org
```sql
-- New: INSERT into org_workers with status = 'accepted'
-- Result: RLS policy now includes them in EXISTS query
-- ✓ Secure: access granted only when officially accepted
```

### Case 3: Admin removes user from org
```sql
-- Admin: UPDATE org_workers SET status = 'declined'
-- Next query: RLS excludes user
-- ✓ Secure: access revoked without data exposure
```

## Monitoring & Audit

To detect RLS policy bypasses or unusual queries:

```sql
-- Log failed RLS checks (if audit logging enabled)
-- Check for:
-- - Repeated queries from same user on unrelated appointments
-- - Queries with suspicious filter combinations
-- - High query count from single user in short time
```

## Related Security

- [SECURITY_FIX_ORG_MODE.md](./SECURITY_FIX_ORG_MODE.md) - Frontend authorization
- [APPROVAL_TRACKING.md](./APPROVAL_TRACKING.md) - Approval attestation
- Database RLS documentation: https://supabase.com/docs/guides/auth/row-level-security

## Checklist: Before Going to Production

- [ ] Apply migration: `20260416_add_org_rls_policies.sql`
- [ ] Verify 3 policies exist: `SELECT * FROM pg_policies WHERE tablename = 'appointments';`
- [ ] Run security test: `node scripts/test-org-view-security.mjs`
- [ ] Manual test: Try cross-org query, verify empty result
- [ ] Review frontend + database layers together
- [ ] Document any custom RLS requirements
- [ ] Train team on RLS concepts

---

**Golden Rule**: Never trust frontend security. Database RLS is the real gatekeeper.

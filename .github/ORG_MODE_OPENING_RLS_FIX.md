# Org Mode Opening Creation RLS Fix

## Problem

When org owners (like sdeqiu) tried to create openings in org mode, the form submission failed silently with a Supabase Row-Level Security (RLS) violation error:

```
Error adding opening: {code: 42501, message: "new row violates row-level security policy for table \"openings\""}
```

The dialog remained open with no visible error message to the user.

## Root Cause

### The Mismatch

The `openings` table RLS policy expected a specific semantics for the `user_id` field:

```sql
-- RLS Policy from migration:
CREATE POLICY "Workers can create org openings"
  ON public.openings FOR INSERT
  WITH CHECK (public.is_worker_of(auth.uid(), user_id));
```

The `is_worker_of()` function checks if the current user is a worker of the org with ID = `user_id`:

```sql
CREATE OR REPLACE FUNCTION public.is_worker_of(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_workers
    WHERE user_id = _user_id AND org_id = _org_id AND status = 'accepted'
  );
$$;
```

### What Was Happening

In `Calendar.tsx`, the code was setting:
```typescript
const workerUserId = getWorkerUserId(workerName);  // Returns individual worker's auth.uid
```

Then inserting:
```typescript
const opening = {
  user_id: workerUserId,  // ❌ Individual worker's ID (e.g., Steve's ID)
  // ...
};
```

This triggered the RLS check:
```sql
is_worker_of(sdeqiu_id, steve_id)  -- ❌ False!
-- "Is sdeqiu a worker of org 'Steve'?"
-- Steve is a person, not an org, so this always fails.
```

## Solution

Changed the logic so that in org mode, `openings.user_id` stores the **org owner's ID** (which is the current user's ID):

### Changes Made

#### 1. Calendar.tsx - addOpening() function (line ~376)
**Before:**
```typescript
const workerUserId = getWorkerUserId(workerName);
```

**After:**
```typescript
// In org mode, openings.user_id stores the org owner's ID (for RLS policy)
// In user mode, it stores the individual provider's ID
const workerUserId = isOrgMode ? user.id : getWorkerUserId(workerName);
```

#### 2. Calendar.tsx - loadOpeningsForMonth() function (line ~186)
**Before:**
```typescript
if (isOrgMode && acceptedWorkers.length > 0) {
  const orgWorkerUserIds = acceptedWorkers
    .filter(w => w.user_id)
    .map(w => w.user_id);
  query = query.in('user_id', orgWorkerUserIds);
}
```

**After:**
```typescript
if (isOrgMode) {
  // In org mode, fetch openings created by this org (user_id = org owner)
  query = query.eq('user_id', user.id);
}
```

#### 3. Appointments.tsx - org view filtering (line ~66)
**Before:**
```typescript
if (isOrgView) {
  const orgMemberIds = acceptedWorkers
    .map((w: any) => w.user_id)
    .filter(Boolean);
  query = query.in('provider_id', orgMemberIds);
}
```

**After:**
```typescript
if (isOrgView) {
  // Org view: show appointments where provider is the org (provider_id = org owner)
  query = query.eq('provider_id', user.id);
}
```

## Result

Now the RLS check passes:
```sql
is_worker_of(sdeqiu_id, sdeqiu_id)  -- ✅ True!
-- "Is sdeqiu a worker of org 'sdeqiu'?"
-- Yes, sdeqiu is the org owner and works for their own org.
```

### Before Fix
- Form submission fails with RLS error 42501
- No visible error message
- Opening is not created
- User is confused

### After Fix
- ✅ Form submits successfully
- ✅ Opening is created in database
- ✅ Opening appears on calendar immediately
- ✅ Opening persists after page refresh
- ✅ No RLS errors in console

## Testing

Added comprehensive test suite: `tests/org-mode-opening-rls-fix.spec.ts`

**Test 1: Opening Creation Without RLS Errors**
- Creates an opening with all required fields (worker, service, location, time)
- Verifies dialog closes (success)
- Verifies no RLS errors in console
- Verifies opening appears on calendar
- Verifies opening persists after page refresh

**Test 2: Display Org Openings**
- Verifies that org openings are displayed in org mode
- Confirms `user_id = org owner` semantics work correctly

## Files Modified
1. `src/components/Calendar.tsx` - Opening creation and filtering logic
2. `src/components/Appointments.tsx` - Org appointments view filtering
3. `tests/org-mode-opening-rls-fix.spec.ts` - New validation tests

## Design Note

The `openings.user_id` field is **mode-dependent**:
- **User mode**: `user_id` = individual provider's auth.uid
- **Org mode**: `user_id` = org owner's auth.uid (for RLS policy to work)

Individual workers are identified by the `worker` field (text name).

A future refactoring could add explicit `provider_id` and `worker_user_id` fields to remove this ambiguity, but that would require schema changes and data migration.

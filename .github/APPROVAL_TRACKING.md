# Approval Tracking Feature

**Status**: ✅ Implemented (Pending Database Migration)

## Overview

Tracks **who approved** each appointment, enabling org team members to see which person approved a booking when it wasn't the opening provider.

### User Story

- **Org member viewing team's appointments**: See "Approved by [Name]" when another org member approved a booking
- **Provider approving own booking**: No display needed (provider knows they approved it)
- **Solo providers**: No change in behavior (still see appointment approved, no attribution needed)

## Implementation Details

### Database Changes

Created migration: `supabase/migrations/20260416_add_approval_tracking.sql`

```sql
-- Add approved_by tracking to appointments table
ALTER TABLE public.appointments 
ADD COLUMN approved_by uuid;

-- Link to who performed the approval
ALTER TABLE public.appointments
ADD CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) 
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- Performance optimization
CREATE INDEX idx_appointments_approved_by ON public.appointments(approved_by);
```

### RPC Functions Updated

#### `approve_appointment(_appointment_id, _provider_id)`

Now sets `approved_by` when approving:

```sql
UPDATE appointments 
SET status = 'confirmed', approved_by = _current_user_id 
WHERE id = _appointment_id;
```

#### `reject_appointment(_appointment_id, _provider_id)`

Also tracks who rejected (uses same `approved_by` field):

```sql
UPDATE appointments 
SET status = 'cancelled', approved_by = _current_user_id 
WHERE id = _appointment_id;
```

### Component Changes

**File**: `src/components/Appointments.tsx`

#### 1. Interface Addition

```typescript
interface Appointment {
  // ... existing fields
  approved_by?: string | null;              // UUID of who approved
  approved_by_name?: string | null;         // Display name of approver
}
```

#### 2. Query Enhancement

- Fetch all approver IDs from approved_by column
- Load approver names via `get_public_profile_names` RPC
- Map names to appointments

```typescript
const approverIds = [...new Set((data || []).map((a: any) => a.approved_by).filter(Boolean))];
const allIds = [...new Set([...providerIds, ...bookerIds, ...approverIds])];
// ... load profile names for all IDs ...
approved_by_name: profileMap.get(a.approved_by)?.full_name || null,
```

#### 3. Display Logic

Show "Approved by" in org mode only when:
- Status is 'confirmed'
- `approved_by` is set and not null
- `approved_by` differs from `provider_id` (not provider approving own)

```typescript
{isOrgView && appointment.status === 'confirmed' && 
 appointment.approved_by && 
 appointment.approved_by !== appointment.provider_id && 
 appointment.approved_by_name && (
  <div className="border-t border-border pt-3">
    <div className="text-sm text-muted-foreground">
      Approved by: <span className="font-medium text-foreground">
        {appointment.approved_by_name}
      </span>
    </div>
  </div>
)}
```

## Deployment Steps

### 1. Apply Database Migration

Option A: Supabase Dashboard
```
1. Go to: https://app.supabase.com/project/ygghiowacyeqktwlsjxo/sql
2. Paste content from: supabase/migrations/20260416_add_approval_tracking.sql
3. Click "Run"
```

Option B: Supabase CLI
```bash
supabase migration push
```

### 2. Code is Already Updated

- `src/components/Appointments.tsx` handles the feature
- Dev server automatically hot-reloads when migration is applied
- Tests available to verify

## Testing

### Run Test Suite

```bash
node scripts/test-approval-tracking.mjs
```

### Manual Testing

1. **Setup**: Ensure you have an organization with 2+ members
2. **Create booking**: 
   - User A creates an opening
   - User B books the opening
3. **Approve as different user**:
   - User C (org member, not A or B) approves the booking
4. **Verify in UI**:
   - Go to Appointments → Org mode
   - Should see "Approved by [User C Name]"
5. **Verify in user mode**:
   - Go to Appointments → User mode
   - User C sees the appointment (as provider) but no "Approved by" text
   - User A sees appointment without "Approved by" (they're the provider)

## Schema Reference

### Appointments Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| ... | ... | Existing fields unchanged |
| approved_by | uuid | NEW: Who approved/rejected this appointment |
| status | text | 'pending', 'confirmed', 'cancelled', 'completed' |

### Key Points

- `approved_by` is nullable (older approvals won't have it set until re-approved)
- `approved_by` can differ from `provider_id` (team approval scenario)
- Always NULL until appointment reaches 'confirmed' or 'cancelled'
- Combined with RLS policies ensures authorization

## Authorization Layers

1. **Query Layer**: Already filters appointments by `provider_id` or `user_id` in user mode
2. **Component Layer**: Only displays "Approved by" in org mode when appropriate
3. **RPC Layer**: `approve_appointment` validates caller is provider
4. **Database RLS**: Table policies enforce who can see appointments

## Future Enhancements

- Add audit timestamp (when approved vs when created)
- Show approval chain for multi-step workflows
- Add rejection reason tracking
- Email notification that includes "Approved by" info
- Dashboard metrics by approver

## Backward Compatibility

- Existing confirmed appointments have `approved_by = NULL`
- UI gracefully handles NULL approver (doesn't show anything)
- No breaking changes to queries or RPC signatures
- Old approvals continue to work as before

## Data Cleanup (Optional)

To backfill `approved_by` for existing confirmed appointments to the provider:

```sql
UPDATE appointments
SET approved_by = provider_id
WHERE status = 'confirmed' 
  AND approved_by IS NULL
  AND created_at < NOW() - INTERVAL '7 days';  -- Adjust timeframe as needed
```

Not required for functionality, but provides historical accuracy.

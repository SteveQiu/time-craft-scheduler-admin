# 📝 MODIFY CONFIRMED APPOINTMENTS FEATURE

## Feature Overview

Users can now modify their **confirmed** appointments to change the time, not just pending ones. This provides greater flexibility for scheduling changes after provider approval.

## What's Changed

### 1. **RPC Function Updated** (`modify_appointment`)
   - **Before**: Could only modify `pending` appointments
   - **After**: Can modify both `pending` AND `confirmed` appointments
   - **Behavior**: 
     - When modifying a confirmed appointment, the new booking starts as `pending` (requires provider re-confirmation)
     - The original opening becomes available again if no other confirmed bookings exist
     - Old appointment is marked as `cancelled`

### 2. **UI Updated** (Appointments.tsx)
   - Modify button now appears for both `pending` and `confirmed` appointments
   - Users can click "Modify" on any confirmed appointment to change the time

### 3. **Migration Created**
   - File: `supabase/migrations/20260415_allow_modify_confirmed_appointments.sql`
   - Updates the `modify_appointment()` RPC function to allow confirmed appointments

## Installation & Deployment

### For Development/Testing

1. **Apply the migration to Supabase:**
   ```bash
   node apply-modify-confirmed-migration.js
   ```
   This will show you the SQL to run manually.

2. **Manual Application:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to SQL Editor
   - Create a new query
   - Copy and paste the SQL from the migration file
   - Click "Run"

3. **Verify the changes:**
   ```bash
   node tests/test-modify-confirmed.mjs
   ```

   Expected output:
   ```
   ✅ Can book appointment
   ✅ Can confirm appointment
   ✅ Can modify CONFIRMED appointment to different time
   ✅ Old appointment is cancelled
   ✅ New appointment is pending (awaiting re-confirmation)
   ✅ Original opening is available again
   ```

### For Production

1. Ensure the migration `20260415_allow_modify_confirmed_appointments.sql` is applied
2. Deploy the updated UI code (Appointments.tsx)
3. No breaking changes - existing functionality preserved

## Usage Flow

### User Experience

1. **Book an appointment** → Appointment created as `pending`
2. **Provider approves** → Appointment becomes `confirmed`
3. **User wants different time** → Click "Modify" button (now available for confirmed!)
4. **Select new time** → New appointment created as `pending`
5. **Provider approves new time** → New appointment becomes `confirmed`
6. **Old appointment** → Automatically cancelled, original opening available

### Provider Experience

- See new pending request when user modifies confirmed appointment
- Can approve or reject the new time
- Original appointment is already cancelled (no cleanup needed)

## Technical Details

### Database Logic

**When modifying a confirmed appointment:**

```sql
-- Cancel old appointment
UPDATE appointments SET status = 'cancelled' WHERE id = _appointment_id;

-- Re-open original opening if no other confirmed bookings
IF NOT EXISTS (
  SELECT 1 FROM appointments 
  WHERE opening_id = _old_apt.opening_id 
  AND status = 'confirmed' 
  AND id != _appointment_id
) THEN
  UPDATE openings SET is_available = true WHERE id = _old_apt.opening_id;
END IF;

-- Create new pending appointment with new opening
INSERT INTO appointments (...) 
VALUES (..., 'pending');
```

### Business Rules

1. ✅ User can only modify their own appointments
2. ✅ Can modify both `pending` and `confirmed` appointments
3. ✅ Cannot modify `cancelled` or `completed` appointments
4. ✅ New opening must be available and not user's own
5. ✅ New appointment starts as `pending` (provider must re-approve)
6. ✅ Original opening reopens when confirmed appointment is cancelled

## Rollback

If you need to revert to the old behavior (only allow modifying pending):

```sql
-- Update RPC to only allow pending
CREATE OR REPLACE FUNCTION public.modify_appointment(...)
AS $$
...
  -- Only allow pending
  IF _old_apt.status != 'pending' THEN
    RAISE EXCEPTION 'Can only modify pending appointments';
  END IF;
...
$$;
```

Then update UI to hide Modify button for confirmed appointments:

```typescript
// In Appointments.tsx
{(appointment.status === 'pending') && !isOrgView && (
  // Show Modify button only for pending
)}
```

## Testing

### Test File
- `tests/test-modify-confirmed.mjs` - Comprehensive test of the feature

### Test Scenarios Covered
1. ✅ Book appointment (pending)
2. ✅ Confirm appointment (provider approves)
3. ✅ Modify confirmed appointment to different time
4. ✅ Verify old appointment is cancelled
5. ✅ Verify new appointment is pending
6. ✅ Verify original opening is available again

### Run Tests
```bash
node tests/test-modify-confirmed.mjs
```

## Files Changed

| File | Change | Type |
|------|--------|------|
| `src/components/Appointments.tsx` | Show Modify button for confirmed | UI |
| `supabase/migrations/20260415_allow_modify_confirmed_appointments.sql` | Update RPC function | Database |
| `tests/test-modify-confirmed.mjs` | Test feature end-to-end | Test |
| `apply-modify-confirmed-migration.js` | Apply migration helper | Script |

## FAQ

**Q: Does the user lose their original time?**
A: No, the user is changing to a different opening/time. The old appointment is cancelled and that time slot becomes available for others.

**Q: Does the provider need to re-approve?**
A: Yes, the new appointment is `pending`, so the provider must approve it. This ensures they're aware of the time change.

**Q: What if the original opening is booked by someone else?**
A: If the original opening already has another confirmed booking, it stays unavailable. If no other confirmed bookings exist, it becomes available again.

**Q: Can the user modify a completed appointment?**
A: No, only `pending` and `confirmed` appointments can be modified.

**Q: What about cancelled appointments?**
A: Cannot modify cancelled appointments (they're already cancelled).

## Summary

✅ **Feature Complete and Working**
- Users can modify confirmed appointments
- Clean business logic: old appointment cancelled, new one pending
- Provider gets new approval request
- Original time slot reopens if no other bookings

Deploy with confidence! 🚀

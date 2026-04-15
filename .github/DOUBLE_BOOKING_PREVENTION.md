# Double-Booking Auto-Reject (ALREADY IMPLEMENTED)

## Status: ✅ LIVE

The logic to auto-reject other pending appointments when 1 is approved is **already implemented** in the database via the `approve_appointment` RPC function (line 102-103 of migration `20260415_fix_rpc_user_validation.sql`).

## How It Works

### Flow:
1. **User A books opening** → Appointment created with status `pending`
2. **User B books same opening** → RPC error: "Opening is no longer available" (locked in book_opening)
3. **Rare case: Both slip through** → 2 pending appointments exist for same opening
4. **Provider approves User A's appointment** → `approve_appointment()` called
5. **Auto-reject triggers** → All OTHER pending appointments for that opening set to `cancelled`
6. **Result** → User B sees appointment automatically rejected

### Code Location:
- **RPC Function**: `approve_appointment` in `supabase/migrations/20260415_fix_rpc_user_validation.sql` (line 68-108)
- **Auto-reject query**: Lines 102-103
  ```sql
  UPDATE appointments SET status = 'cancelled' 
  WHERE opening_id = _apt.opening_id AND id != _appointment_id AND status = 'pending';
  ```

### Frontend:
- **Component**: `src/components/Appointments.tsx` (line 131-145)
- **Toast message**: "Appointment approved! Other pending requests were automatically declined."

## Double-Booking Prevention Strategy

### Layers of Protection:

1. **Immediate Locking** (book_opening RPC in `supabase/migrations/20260415_immediate_opening_lock_clean.sql`):
   - Opening marked `is_available = false` right after booking
   - Prevents further bookings from being visible

2. **Concurrent Booking Handling** (approve_appointment RPC):
   - If 2 users both sneak through (rare), only 1 gets approved
   - Other is automatically cancelled
   - No manual work needed

3. **UI Feedback**:
   - Toast confirms: "Other pending requests were automatically declined"
   - User sees clear status updates

## Testing

To verify:
```bash
# 1. Book opening normally
# 2. Approve the appointment
# 3. Check any other pending appointments - should be cancelled
```

Or simulate:
```sql
-- In SQL Editor:
SELECT * FROM appointments WHERE opening_id = '<opening-id>' ORDER BY created_at;
```

You'll see approved one with `status = 'confirmed'` and others with `status = 'cancelled'`.

## No Action Needed

The double-booking auto-reject is already deployed and working. Both the lock (line 51-64) and auto-reject (line 102-103) are active.

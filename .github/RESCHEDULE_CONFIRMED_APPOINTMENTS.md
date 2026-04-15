# Allow Customers to Reschedule Confirmed Appointments

## Overview

Customers can now reschedule both pending and confirmed appointments to a different date/time. When rescheduling a confirmed appointment, the old appointment is cancelled and a new pending appointment is created that requires provider re-approval.

## Feature Implementation

### User Flow

1. **Browse Appointments** - Customer views their appointments in `/appointments` page
2. **Select Reschedule** - Customer clicks "Modify" button on a pending or confirmed appointment
3. **Choose New Time** - ModifyAppointmentDialog shows available openings for same worker/service
4. **Submit** - Customer selects new date/time and confirms
5. **Status Changes**:
   - Old appointment → `cancelled`
   - New appointment → `pending` (awaiting provider approval)
6. **Provider Review** - Provider sees new pending request and can approve/reject
7. **Final Status** - New appointment becomes `confirmed` or `cancelled` based on provider action

### Components Modified

#### `src/components/Appointments.tsx` (Line 362)
Changed from:
```typescript
{appointment.status === 'pending' && !isOrgView && (
```

To:
```typescript
{(appointment.status === 'pending' || appointment.status === 'confirmed') && !isOrgView && (
```

This shows the "Modify" button for both pending and confirmed appointments in the customer view.

#### `src/components/ModifyAppointmentDialog.tsx` (No changes needed)
Already correctly:
- Queries available openings by `worker`, `service`, and `user_id` (provider)
- Calls `modify_appointment` RPC with correct parameters
- Shows opening details and handles rescheduling

### Database Changes

**File**: `supabase/migrations/20260415_allow_modify_confirmed_appointments.sql`

Updated the `modify_appointment()` RPC function:

```sql
CREATE OR REPLACE FUNCTION public.modify_appointment(
  _appointment_id UUID,
  _new_opening_id UUID,
  _caller_id UUID
)
RETURNS uuid
```

**Key Changes**:
- Changed validation from `IF _old_apt.status != 'pending'` to `IF _old_apt.status NOT IN ('pending', 'confirmed')`
- Allows modification of confirmed appointments
- Maintains all security checks:
  - Only appointment owner can reschedule (verified via `_caller_id`)
  - New opening must be available
  - Cannot book own opening (provider constraint)
- Creates new appointment as `pending` for provider re-approval

## Testing & Deployment

### Prerequisites
- Supabase account with admin access
- Access to SQL Editor in Supabase dashboard

### Step 1: Apply Migration

Execute the SQL migration in Supabase SQL Editor:

```bash
node tests/apply-migration-manual.mjs
```

This outputs the SQL to execute. Then:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to SQL Editor
4. Click "New Query"
5. Paste the SQL from migration file
6. Click "Run"

### Step 2: Verify Implementation

```bash
node tests/verify-reschedule-flow.mjs
```

This script:
1. Finds an existing confirmed appointment
2. Calls the `modify_appointment` RPC
3. Verifies the old appointment is cancelled
4. Verifies the new appointment is pending

### Step 3: Manual Testing in UI

1. Sign in as a customer user
2. Go to `/appointments` page
3. Find a confirmed appointment
4. Click the "Modify" button
5. Select an alternative date/time
6. Confirm the change
7. Verify:
   - Old appointment shows as "Cancelled"
   - New appointment shows as "Pending"
   - Provider can see and approve/reject the new request

## Business Logic

### Appointment Lifecycle After Reschedule

```
Original Appointment (Confirmed)
         ↓
    [Click Modify]
         ↓
   Old: Cancelled
   New: Pending (awaiting provider re-approval)
         ↓
   Provider Reviews
      ↙      ↘
  Approve   Reject
    ↓         ↓
 Confirmed  Cancelled
```

### Validation Rules

Customer can only:
- ✅ Reschedule appointments they own (verified by `user_id`)
- ✅ Reschedule to openings for the same worker and service
- ✅ Reschedule to available openings only
- ✅ Cannot reschedule cancelled or completed appointments

## Security Considerations

- **Row-Level Security (RLS)**: Customers see only their own appointments
- **Authorization**: Only the appointment owner (`user_id`) can reschedule
- **Provider Constraint**: Cannot reschedule to own opening (provider check in RPC)
- **SECURITY DEFINER**: RPC runs with elevated privileges for data consistency
- **Optimistic Locking**: Uses `FOR UPDATE` to prevent race conditions

## Troubleshooting

### Issue: "Can only modify pending appointments" error

**Cause**: Migration not applied - old RPC still in database

**Solution**: 
1. Run `node tests/apply-migration-manual.mjs`
2. Copy the output SQL
3. Execute in Supabase SQL Editor

### Issue: "New opening is no longer available"

**Cause**: Another customer booked the opening between dialog open and confirmation

**Solution**: Tell customer to select a different opening

### Issue: No "Modify" button visible

**Causes**:
- Viewing as provider (org view) - only customers see button
- Appointment already cancelled or completed
- JavaScript error preventing render

**Solution**:
- Check browser console for errors
- Verify account role/view
- Check appointment status

## Files Changed

1. `src/components/Appointments.tsx` - Added confirmed status to Modify button condition
2. `supabase/migrations/20260415_allow_modify_confirmed_appointments.sql` - Updated RPC function
3. `tests/verify-reschedule-flow.mjs` - New verification script
4. `tests/apply-migration-manual.mjs` - Migration instructions
5. `tests/update-rpc.mjs` - Helper to output migration SQL
6. `debug-appointments.mjs` - Debug script for schema inspection

## Next Steps

- [ ] Apply migration to production database
- [ ] Test reschedule flow end-to-end
- [ ] Add email notifications when appointment is rescheduled
- [ ] Add appointment history/audit log to show previous dates
- [ ] Add confirmation email for provider when new reschedule request received

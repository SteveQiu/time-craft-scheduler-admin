# Moya — History & Learnings

## Learnings

### Add to Calendar Feature (2025)
- **Appointment data shape**: `Appointment` interface has `service`, `worker`, `date`, `start_time`, `end_time`, `location`, `notes`
- **UI patterns**: Using shadcn `DropdownMenu` components for calendar export options
- **Calendar formats**: Google Calendar uses UTC format `YYYYMMDDTHHmmssZ`, Outlook uses ISO8601, ICS uses VEVENT blocks
- **Bulk actions**: Added to the bulk action bar alongside Approve/Complete/Modify/Cancel buttons
- **Placement**: Calendar button added to both individual appointment cards and grouped pending requests
- **Implementation**: Helper functions `toGoogleCalendarUrl()`, `toOutlookUrl()`, `toICSContent()`, `downloadICS()` for different calendar formats

## Learnings

### 2026 — Bulk Deny

- **RPC**: `reject_appointment(_appointment_id, _provider_id)` — distinct from `cancel_appointment`; use for denying pending requests
- **Pattern**: Bulk deny mirrors bulk approve exactly — same filter (`status === 'pending' && provider_id === user.id`), same prop threading (`onBulkDeny` → `onDeny`)
- **Styling**: Deny button uses `variant="destructive"` to distinguish from Approve (`variant="default"`)
- **Visibility**: Both Approve and Deny show when `hasPending && isProviderOfAny` in BulkActionBar
- **Files touched**: `useAppointmentActions.ts`, `BulkActionBar.tsx`, `AppointmentList.tsx`, `Appointments.tsx`


**Project:** time-craft-scheduler-admin
**What happened:**
- Dallas attempted to add cash payment visibility to the Paid button in Appointments.tsx:
  - Created supabase migration: `20260507_add_payment_method_type_to_proofs.sql`
  - Updated `src/integrations/supabase/types.ts` with payment_method_type field
  - Modified `src/components/Appointments.tsx` for controlled Tabs + cash styling
- tsc and npm run build passed, but runtime broke (blank-page style crash)
- Commit b1609e5 was reverted in commit 1b803ad
- **Steve's directive: Never git commit unless it is for deployment**

**Key learnings:**
- Appointments.tsx is a large, fragile component — silent runtime failures possible even when tsc/build pass
- Future cash button work needs surgical, minimal changes with runtime verification before commit
- All `.squad/` file updates (history, decisions, logs) are disk-only — no git commits
- Dev server runs on http://localhost:8080 via `npm run dev`

### Bulk Deny Implementation (2026-05-16)

**Task:** Add bulk deny (reject) button to BulkActionBar for pending appointments.

**Files modified:**
- `src/hooks/useAppointmentActions.ts` — added `handleBulkDeny` function. Filters appointments by `status === 'pending' && provider_id === user.id`. Calls `reject_appointment` RPC for each selected appointment. Returns array of results.
- `src/components/Appointments.tsx` — added `onBulkDeny` prop. Wires `handleBulkDeny` from `useAppointmentActions` to pass down tree.
- `src/components/appointments/AppointmentList.tsx` — updated interface to accept `onBulkDeny` prop, destructures and passes to BulkActionBar.
- `src/components/appointments/BulkActionBar.tsx` — added Deny button (variant="destructive", shows count "Deny (5)" etc). Button visible when `hasPending && isProviderOfAny` (same condition as Approve button). Approve button unchanged.

**Decision:** Use `reject_appointment` RPC (not `cancel_appointment`). Semantically correct for denying pending requests (may reopen opening slot). Mirrors individual "Reject" button in PendingGroupSection.

**Build:** ✅ exit 0  
**TypeScript:** ✅ 0 errors

**Verification:** Ralph verified Deny button appears alongside Approve for pending appointments, Approve button unchanged, no regressions.

**Status:** ✅ APPROVED FOR RELEASE

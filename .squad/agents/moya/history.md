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

### 2026-05-07 — Session: Cash button revert + no-commit directive

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

# Project Context

- **Project:** time-craft-scheduler-admin
- **Created:** 2026-04-22

## Core Context

Agent Ralph initialized and ready for work.

## Recent Updates

📌 Team initialized on 2026-04-22

## Learnings

Initial setup complete.

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

## Clean Code Refactor Test Suite (2026-05-09)

**Task:** Write Playwright specs for refactored components. Baseline all tests at 33/33 PASS.

**Deliverables:**
- 4 Playwright spec files
- 33 test cases total:
  - Appointments workflows (create, view, filter)
  - Calendar interactions (navigate, select date)
  - Profile updates (edit, photo upload)
  - Settings changes (subscription, roles)

**Build:** ✅ 33/33 PASS (baseline established)

**Verification:** Final runtime verification run in progress.

**Pattern:** Tests cover happy path + edge cases. Each spec targets one component. Reuse fixtures for auth, data setup.

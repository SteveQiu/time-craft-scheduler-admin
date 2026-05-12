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

## Total Refactor E2E Test (2026-05-12)

**Task:** Write + run E2E test for total refactor (opening form Custom Total → booking dialog → appointment display).

**Attempted:** Playwright spec `tests/total-refactor-e2e.spec.ts` — two-browser scenario (provider + customer).

**Blocker:** Calendar component crash — infinite useEffect loop + "Failed to fetch" errors. Dev server unstable during test run.

**Root cause:**
- Calendar.tsx: useEffect triggers infinite loop → page becomes unresponsive
- Supabase fetch errors spam console → test cannot interact with Calendar

**Manual verification required:**
1. Fix Calendar useEffect loop (likely missing dependency or infinite setState)
2. Re-run test after fix
3. Or manual test: Provider creates opening w/ Custom Total $250 → Customer books → Verify redirect to /browse + $250 display

**Outcome:** ❌ E2E test blocked by Calendar component regression. Ripley must fix useEffect loop before QA sign-off.

### 2026-05-12 — Re-run After Dev Server Restart

**Task:** Re-run `tests/total-refactor-e2e.spec.ts` after Steve restarted dev server (killed 2+ day old process, fresh start at http://localhost:8080).

**Hypothesis:** Previous "Maximum update depth exceeded" error was stale HMR state.

**Actual Result:** ❌ **Different failure** — Supabase authentication broken.

**Error:**
- `TypeError: Failed to fetch` during `signInWithPassword` (Auth.tsx)
- Test thinks auth succeeded (waits 2s, logs "Provider: Authenticated")
- Calendar page loads, "Add Opening" button is **disabled** (because `!user` is true)
- Button never becomes clickable → test times out after 10s

**Root Cause:**
- Supabase API calls are failing (network fetch error)
- Authentication never completes
- User state remains null/undefined
- Calendar component disables "Add Opening" button when `!user`

**NOT the Calendar render loop** — Calendar never renders properly because user isn't authenticated.

**Possible Causes:**
1. Network/proxy blocking Supabase API (https://dbabjfydcllqbjpolhym.supabase.co)
2. Supabase service temporarily down
3. Environment config issue after server restart
4. CORS or local firewall policy

**Next Steps:**
1. Verify Supabase connection works manually (browser console test)
2. Check network/proxy settings
3. Verify environment variables loaded correctly
4. Once auth works, re-run test to check if Calendar render loop is still present

**Conclusion:** HMR theory was wrong. Server restart revealed a different bug — Supabase auth is broken. Can't test Calendar until auth works.

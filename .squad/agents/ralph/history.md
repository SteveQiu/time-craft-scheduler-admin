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

### 2026-05-12 — Legal Compliance QA Cycle (BLOCKED)

**Task:** Verify Ripley's 3 legal page changes + extend test with SubscriptionTab cancel button cases.

**Result:** ❌ **BLOCKED** — 0/7 baseline tests pass. All pages blank.

**Failure Mode:**
- `tests/legal-pages-qa.spec.ts` — 7/7 fail
- All 3 legal pages (`/terms`, `/privacy`, `/refund`) render blank (desktop + mobile)
- Auth page (`/auth`) also blank (signup tab timeout)
- Screenshots: solid gray, no content

**Not Ripley's Fault:**
- Ripley's changes: `Refund.tsx` EU/UK `<strong>`, `Terms.tsx` Section 5 links, `SubscriptionTab.tsx` cancel button
- All 3 are syntactically valid JSX, isolated edits
- Runtime crash affects ALL pages (not just legal), suggests broken global component or routing

**Diagnostics:**
- tsc: ✅ Clean exit
- npm run build: ✅ Passes (1 warning: duplicate `"prepare"` key in package.json)
- Dev server: Logs "ready in 947 ms" but pages don't load
- Restarted server 3× — same result

**Root Cause Hypothesis:**
- Pre-existing runtime error (likely in `App.tsx` lines 79/108 `<main>` wrappers, or `AppSidebar`, or global providers)
- Matches Dallas pattern: tsc passes, runtime crashes (see 2026-05-07 cash button revert)

**Blocked Work:**
- Cannot verify EU/UK `<strong>` rendering (page blank)
- Cannot verify Terms Section 5 links (page blank)
- Cannot extend test for SubscriptionTab cancel button (page blank)
- Manual visual sanity-check impossible

**Next Steps:**
1. Debug blank-page crash (check `App.tsx`, `AppSidebar.tsx`, legal page imports/exports)
2. Run baseline test to confirm 7/7 PASS
3. Re-run this QA cycle after fix

**Escalation:** Flagged to coordinator. Ripley's changes syntactically correct but unverifiable until runtime fixed.

**Lesson:** Baseline tests were already broken BEFORE Ripley's changes. Legal cycle exposed pre-existing app-wide crash.

---

### 2026-05-12 — Legal Compliance QA Pass 2 (RESOLVED ✅)

**False Block Root Cause:**
1. **Pipe truncation killed dev server.** Earlier QA used `npm run dev | Select-Object -First N`, which closed vite's stdout when pipe terminated → vite exited code 0.
2. **Zombie port race.** Each dead vite left process holding port 8080. Next vite bound to 8081, 8082 — but tests hardcoded 8080 → blank pages.

**Solution:** Checked ports 8080-8082 before start (clear). Started vite `mode: "async"` WITHOUT pipes. Confirmed 8080 responds (HTTP 200).

**DOM Duplication Fixed:** App.tsx renders 2× `<main>` (desktop + mobile, both in DOM). Playwright strict mode violations fixed with `.first()` (desktop) or `.last()` (mobile).

**Result:** ✅ **7/7 baseline tests PASS** (20.2s, HTTP 200, no console errors, pages NOT blank).

**Cancel UX:** ⚠️ **5/5 SKIPPED** — Auth timeout (test account issue). Visual verification incomplete.

**Recommendation:** **APPROVE legal pages**. Cancel button needs manual QA or fixed test account.

---

## Learnings (Updated 2026-05-12)

### PowerShell Pipe Truncation + Zombie Ports

**Problem:** `npm run dev | Select-Object -First N` kills vite when PowerShell closes upstream pipe → vite exits code 0 → server dies mid-test.

**Solution:** Use `powershell` with `mode: "async"` and NO pipes/Out-String when starting long-lived processes.

**Port Detection:** Before launching dev server:
```powershell
Get-NetTCPConnection -LocalPort 8080,8081,8082 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
```
If occupied, kill with `Stop-Process -Id <PID> -Force`.

**Vite Port Fallback:** Vite binds to next available port if 8080 occupied. Always verify bound port in vite output matches test `BASE_URL` — OR make BASE_URL dynamic.

### DOM Duplication in App.tsx

**Problem:** App.tsx renders 2× `<Routes>` in 2× `<main>` (desktop `hidden md:flex`, mobile `md:hidden`). Both in DOM. Playwright `locator('main')` matches both → strict mode violations.

**Solution:** Use `.first()` for desktop viewport (1280×800), `.last()` for mobile viewport (375×667).

**Same Issue with Auth.tsx:** 2× email input, 2× password input, 2× "Sign In" button (sidebar + form). Always use `.first()` or `.last()`.

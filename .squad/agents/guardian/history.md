# Guardian's Project Knowledge

## Day 1: Initialization

**Project:** time-craft-scheduler-admin  
**User:** steve  
**Role:** Security & Secrets Guardian

Guardian deployed to prevent accidental leaks of API keys, credentials, and secrets before git commits.

### Mission

Block any commit attempt containing:
- API keys (AWS, GitHub, Stripe, etc.)
- OAuth tokens, JWTs, personal access tokens
- Database passwords, connection strings
- Private SSL/TLS/SSH keys
- Encryption keys, certificates

### Integration Points

- Pre-commit hook: scan staged changes
- Audit trail: history.md logs all checks
- Whitelist: safe patterns stored locally

---

## Learnings

(To be populated as Guardian scans commits and learns patterns)

---

## Session: Pre-commit secrets scan added

**Task:** Add secrets scan step to `.husky/pre-commit` hook.

**Implemented:** Inline shell script scanning staged files (`git diff --cached --name-only --diff-filter=ACM`) before the TypeScript check (fail-fast on secrets).

**Patterns detected:**
1. Supabase `service_role` JWT — Node.js decodes JWT payload, checks `role` claim
2. PEM private keys (`-----BEGIN [RSA ]PRIVATE KEY-----`)
3. AWS secret access key assignments (`aws_secret_access_key=<30+chars>`)
4. GitHub PATs (`ghp_`, `ghs_`, `gho_`, `github_pat_` prefixes)
5. High-entropy credential assignments (`password=`, `secret=`, `token=` + 32+ chars)

**Whitelisted (safe, not blocked):**
- `VITE_SUPABASE_PUBLISHABLE_KEY` — anon JWT; JWT decode confirms `role=anon`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_APP_URL` — URLs/IDs, not secrets
- JWT values in pattern #5 excluded (handled by JWT-aware check #1)

**Verified:** Ran patterns against `.env` — no false positives. Anon JWT correctly identified and allowed.

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

---

## Session: LemonSqueezy Payment Security Audit

**Date:** 2026-05-XX
**Task:** Comprehensive attack surface audit of LemonSqueezy payment integration

**Scope:** Webhook handler (`lemonsqueezy-webhook/index.ts`), checkout creation (`create-checkout/index.ts`), frontend payment components, DB schema (`orgs`, `subscriptions`)

### Critical Findings

1. **CRITICAL: No idempotency/replay protection**
   - Webhook has no idempotency key check
   - Same event can be processed multiple times → duplicate plan upgrades
   - LemonSqueezy sends `event.data.id` (subscription ID), but webhook never stores processed event IDs
   - **Impact:** Attacker captures signed webhook → replays → free premium access

2. **CRITICAL: No RLS policy for service_role on orgs table**
   - Webhook uses `service_role` to UPDATE orgs table
   - RLS policies only cover user operations (select/insert/update own record)
   - No explicit service_role policy — relies on service_role bypassing RLS
   - **Risks:** If service_role key leaked, attacker can upgrade any org to premium
   - Migration `20260617_add_subscription_timestamps.sql` enables RLS but no service_role policy

3. **HIGH: create-checkout has CORS wildcard**
   - `Access-Control-Allow-Origin: "*"` allows any domain to call endpoint
   - Relies on Supabase JWT auth, but CORS wildcard still risky
   - **Impact:** CSRF-style attacks possible if JWT leaks or browser extension compromises session

4. **HIGH: No rate limiting on create-checkout**
   - Anyone with valid JWT can spam checkout creation
   - LemonSqueezy may have their own limits, but no app-level protection
   - **Impact:** DoS, quota exhaustion, spammy abandoned carts in LS dashboard

5. **MEDIUM: Test mode bypass potential**
   - `BLOCK_TEST_WEBHOOKS` checked at line 30 webhook handler
   - If env var not set or attacker manipulates env → test webhooks hit prod DB
   - Frontend sends `isTest: window.location.hostname === 'localhost'` — client-controlled
   - **Impact:** Test payments give real premium access if BLOCK_TEST_WEBHOOKS missing

6. **MEDIUM: custom_data trust boundary**
   - Frontend sends `orgId`, `userId`, `userEmail` to `create-checkout`
   - These go into LemonSqueezy `custom_data` field
   - LS signs entire payload AFTER custom_data is set → tamper-proof
   - **Safe:** Attacker can't change custom_data post-checkout-creation (HMAC covers it)
   - **Risk:** Malicious user could call `create-checkout` with *another user's orgId* if they bypass frontend
   - **Mitigation:** Supabase Edge Function requires JWT auth → can only use own orgId (user.id)

7. **LOW: User-Agent check is defense-in-depth only**
   - Line 11 webhook: `if (!userAgent.startsWith("LemonSqueezy"))` → 403
   - Trivially spoofed, but layered with HMAC makes this acceptable

8. **LOW: Subscription ID enumeration**
   - LemonSqueezy subscription IDs are probably sequential or guessable
   - But webhook signature verification prevents forged webhooks
   - **Safe:** Can't forge webhook without signing secret

### Attack Vectors Analysis

**✅ SAFE:**
- **custom_data tampering:** HMAC signature computed *after* custom_data set → tamper-proof
- **Checkout URL manipulation:** Variant ID embedded in backend, not client-controlled
- **Email match exploit:** Webhook uses `custom_data.org_id`, not email matching
- **Subscription ID forgery:** HMAC verification blocks forged webhooks
- **Direct Supabase function bypass:** JWT auth required on create-checkout
- **Webhook secret exposure:** Not logged or returned (verified lines 16, 128)

**🚨 VULNERABLE:**
- **Replay attacks:** No processed event ID tracking
- **Race conditions:** No locking, same event can process simultaneously
- **Test mode abuse:** Client controls `isTest` flag, env var may be unset
- **Privilege escalation:** Replay + missing idempotency = free premium

### Recommended Fixes (Priority Order)

**P0 — Deploy immediately:**
1. Add `webhook_events` table for idempotency:
   ```sql
   CREATE TABLE webhook_events (
     id TEXT PRIMARY KEY,  -- event.data.id from LS
     event_name TEXT NOT NULL,
     processed_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX idx_webhook_events_id ON webhook_events(id);
   ```
   Webhook handler: Check if event.data.id exists before processing

2. Add explicit RLS policy for service_role on orgs:
   ```sql
   CREATE POLICY "service_role_orgs_all" ON orgs FOR ALL
     USING (auth.role() = 'service_role');
   ```

**P1 — Deploy this week:**
3. Remove CORS wildcard from create-checkout (restrict to app domain)
4. Add rate limiting to create-checkout (5 calls/minute per user)
5. Enforce `BLOCK_TEST_WEBHOOKS=true` in production env
6. Add backend validation: reject create-checkout if orgId ≠ auth.uid()

**P2 — Deploy within 2 weeks:**
7. Replace User-Agent check with proper webhook IP allowlist (LS IP ranges)
8. Add logging: Store all webhook events (success + failure) for audit trail
9. Add alerting: Slack/email notification on repeated replay attempts

### Evidence Summary

- **No idempotency:** Searched entire webhook handler — no `processed_events`, `webhook_log`, or similar table/check
- **No rate limit:** Searched all functions — only `user-data-export` has rate limiting (in DB function)
- **CORS wildcard:** Line 1-3 create-checkout: `"Access-Control-Allow-Origin": "*"`
- **Test mode client-controlled:** Line 116 PremiumUpgrade.tsx: `isTest: window.location.hostname === 'localhost'`
- **RLS gap:** Migration 20260617 enables RLS on orgs, but only has user policies (select_own, insert_own, update_own) — no service_role policy

### 2026-05-08 � Payment attack surface audit (LemonSqueezy)

**Findings:** 3 CRITICAL, 4 HIGH, 5 MEDIUM, 4 LOW. Full report at `.squad/decisions/inbox/guardian-payment-security-v2.md`.

**Critical (money-loss live):**
- C1: Client-controlled `isTest` flag in create-checkout body ? free premium via test card on prod when `BLOCK_TEST_WEBHOOKS` not set.
- C2: `create-checkout` has no JWT auth, no org membership check. Caller passes arbitrary `orgId`/`userId`/`userEmail`.
- C3: Webhook trusts `custom_data.org_id`/`user_id` blindly; no membership cross-check.

**High:**
- H1: Webhook body+signature replayable; no `webhook_id` dedup table.
- H2: No `updated_at` ordering guard ? out-of-order LS retries can re-grant premium after cancel.
- H3: Concurrent events not atomic.
- H4: `BLOCK_TEST_WEBHOOKS` defaults to OFF � fail-open.

**Ruled out:** HMAC forgery, email-match takeover, checkout URL tamper, secret leak in logs.

**Pattern learned:** Edge functions in this repo default to `verify_jwt=true` only when explicitly set in `config.toml`. `create-checkout` has no entry ? relies on Supabase default which only validates anon JWT (public key, not authentication). Must do explicit `auth.getUser(token)` for true auth in any privileged Edge Function.

**Convention reminder:** All `custom_data` in payment provider webhooks must be treated as attacker-influenced unless the provider+integration guarantees server-side derivation. LS lets the merchant set custom_data freely at checkout creation, so it inherits the trust level of whatever creates the checkout. Lock down checkout creation first.

### 2026-07-02 — Profile address consolidation

- Public profile address now references `profiles.public_address_id -> workplace_addresses.id`; legacy `profiles.address` dropped by review migration.
- Public RPC exposure pattern: `SECURITY DEFINER` + fixed `search_path`, `address_public` gate, return formatted string only. Never expose raw address JSON, label, is_default, or user_id.

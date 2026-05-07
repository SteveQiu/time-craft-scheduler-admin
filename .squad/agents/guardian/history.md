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

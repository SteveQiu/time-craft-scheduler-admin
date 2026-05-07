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

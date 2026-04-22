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

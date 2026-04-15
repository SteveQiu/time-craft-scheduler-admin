# .github Directory - Documentation & Configuration

This directory contains all non-code documentation, policies, and GitHub-specific configuration.

## 📋 Documentation Index

### Getting Started
- **REPOSITORY_STRUCTURE.md** - How files are organized and where to put new files
- **DEPLOYMENT_PROCESS_SUMMARY.md** - Quick overview of deployment process

### Immediate Opening Lock (Double-Booking Fix)
- **IMMEDIATE_OPENING_LOCK_DEPLOYMENT.md** - Quick start guide (2 minutes to deploy)
- **IMMEDIATE_OPENING_LOCK_SUMMARY.md** - Technical summary of the fix
- **IMMEDIATE_OPENING_LOCK.md** - Detailed technical documentation
- **OPENING_LOCK_CHECKLIST.md** - Step-by-step deployment checklist

### Migration Process
- **SUPABASE_MIGRATION_PROCESS.md** - 7-step migration framework
- **MIGRATION_INSTRUCTIONS.md** - Manual deployment instructions
- **DEPLOYMENT_READY.md** - Deployment status and readiness
- **MIGRATION_EXECUTION_REPORT.md** - Technical execution guide

### Network & Credentials
- **HANDLING_NETWORK_RESTRICTED_MIGRATIONS.md** - Solutions for firewall-blocked deployments
- **SUPABASE_CREDENTIALS_REPORT.md** - Credential analysis and network restrictions

### Workflow Files
- **workflows/** - GitHub Actions CI/CD workflows

---

## 🚀 Common Tasks

### Deploy the Opening Lock Migration
```bash
cd scripts
node display-migration-sql.mjs           # See the SQL
# Then paste in Supabase SQL Editor and run
node ../tests/verify-opening-lock.mjs    # Verify
```

### Understand Repository Structure
See: `REPOSITORY_STRUCTURE.md`

### Troubleshoot Network Issues
See: `HANDLING_NETWORK_RESTRICTED_MIGRATIONS.md`

### Follow Migration Framework
See: `SUPABASE_MIGRATION_PROCESS.md`

---

## 📂 File Organization

**Root folder** - Only config files  
**scripts/** - All runnable scripts  
**tests/** - All test files  
**src/** - Source code  
**.github/** - Documentation (this folder)

See `REPOSITORY_STRUCTURE.md` for details.

---

## ✨ Quick Links

| Document | Purpose |
|----------|---------|
| REPOSITORY_STRUCTURE.md | Where to put files |
| IMMEDIATE_OPENING_LOCK_DEPLOYMENT.md | Deploy the fix |
| HANDLING_NETWORK_RESTRICTED_MIGRATIONS.md | Network troubleshooting |
| SUPABASE_MIGRATION_PROCESS.md | Migration framework |

---

## 📝 When Creating New Files

1. **Documentation?** → Put it here in `.github/`
2. **Script/executable?** → Put it in `scripts/`
3. **Test?** → Put it in `tests/`
4. **Source code?** → Put it in `src/`

Reference: `REPOSITORY_STRUCTURE.md`

# .github Documentation

All non-code documentation and configuration.

## 📚 Quick Links

| Document | Purpose |
|----------|---------|
| **REPOSITORY_STRUCTURE.md** | File organization policy |
| **DECISION_MAKING_PRINCIPLES.md** | How I work: do it, don't ask |
| **MIGRATION_VERIFIED.md** | Opening lock migration status ✅ |
| **DOUBLE_BOOKING_PREVENTION.md** | Double-booking prevention logic |
| **IMMEDIATE_OPENING_LOCK_DEPLOYMENT.md** | Deployment guide |
| **DEPLOYMENT_COMPLETE.md** | Deployment status |
| **DEPLOY_NOW.md** | Step-by-step deployment (if needed) |
| **HANDLING_NETWORK_RESTRICTED_MIGRATIONS.md** | Firewall & network solutions |
| **supabase/migrations/20260415_immediate_opening_lock_clean.sql** | Migration SQL |

## 🎯 Essential Info

### Current Status
- ✅ Opening lock migration deployed
- ✅ Double-booking prevention active
- ✅ Auto-reject on approval working

### File Organization
```
root/            - Config only (package.json, tsconfig.json, etc)
scripts/         - All executable scripts
tests/           - All tests
src/             - Source code
.github/         - Documentation (this folder)
```

See `REPOSITORY_STRUCTURE.md` for policy.

## 📝 When Adding Files
1. **Documentation?** → `.github/` (you are here)
2. **Script?** → `scripts/`
3. **Test?** → `tests/`
4. **Source code?** → `src/`

See `DECISION_MAKING_PRINCIPLES.md` for how I handle tasks.

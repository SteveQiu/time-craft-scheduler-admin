# Repository Structure Policy

## Principle: Keep Root Folder Clean

The root directory should only contain:
- **Essential configuration files** (.env, .secret, package.json, tsconfig.json, vite.config.ts, etc.)
- **Documentation** (README.md only - quick project overview)
- **Build outputs** (dist/)
- **Standard folders** (src/, public/, node_modules/, .git/, .github/, supabase/, tests/)

---

## File Organization Rules

### ✅ Root Folder KEEPS
```
├── .env                          # Environment variables
├── .secret                       # Credentials (gitignored)
├── .github/                      # GitHub configuration
├── .gitignore                    # Git ignore rules
├── src/                          # Source code
├── public/                       # Static assets
├── tests/                        # Test suite
├── scripts/                      # Runnable scripts (npm run)
├── supabase/                     # Supabase migrations & config
├── dist/                         # Build output
├── node_modules/                 # Dependencies
├── index.html                    # Entry point
├── package.json                  # Project manifest
├── package-lock.json             # Dependency lock
├── README.md                     # Project overview only
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Build config
├── tailwind.config.ts            # Tailwind config
├── postcss.config.js             # PostCSS config
├── eslint.config.js              # ESLint config
└── components.json               # Component library config
```

### ❌ Root Folder MOVES TO `supabase/migrations/`
All SQL files:
- Database schemas → `supabase/migrations/*.sql`
- RLS policies → `supabase/migrations/*.sql`
- Data migrations → `supabase/migrations/*.sql`
- Fixes and patches → `supabase/migrations/*.sql`

### ❌ Root Folder MOVES TO `.github/`
All markdown files EXCEPT README.md:
- Deployment guides → `.github/DEPLOYMENT_*.md`
- Migration docs → `.github/MIGRATION_*.md`
- Process docs → `.github/PROCESS_*.md`
- Technical specs → `.github/TECHNICAL_*.md`
- Troubleshooting → `.github/TROUBLESHOOTING_*.md`
- Checklists → `.github/CHECKLIST_*.md`

### ❌ Root Folder MOVES TO `scripts/`
All executable scripts (.js, .mjs, .sh, .py):
- Migration runners → `scripts/migrate-*.js`
- Debug tools → `scripts/debug-*.js`
- Deployment helpers → `scripts/deploy-*.js`
- Verification tools → `scripts/verify-*.js`
- Utilities → `scripts/utility-*.js`

### ❌ Root Folder MOVES TO `tests/`
All test files:
- Playwright tests → `tests/*.spec.ts`
- Unit tests → `tests/*.test.ts`
- Validation scripts → `tests/validate-*.js`
- RPC tests → `tests/test-*.js` or `tests/test-*.mjs`
- Debug scripts → `tests/debug-*.js`

### ❌ Temporary Files NEVER in Root
- Screenshots → `test-results/` or `.github/assets/`
- Reports → `migration-reports/` or `.github/reports/`
- Debug logs → `.github/debug-logs/` or `.copilot/`
- Scratch files → `.copilot/session-state/` (never committed)

---

## Current Structure

```
.github/
├── DEPLOYMENT_READY.md
├── DEPLOYMENT_PROCESS_SUMMARY.md
├── HANDLING_NETWORK_RESTRICTED_MIGRATIONS.md
├── IMMEDIATE_OPENING_LOCK.md
├── IMMEDIATE_OPENING_LOCK_DEPLOYMENT.md
├── IMMEDIATE_OPENING_LOCK_SUMMARY.md
├── MIGRATION_EXECUTION_REPORT.md
├── MIGRATION_INSTRUCTIONS.md
├── OPENING_LOCK_CHECKLIST.md
├── SUPABASE_CREDENTIALS_REPORT.md
├── SUPABASE_MIGRATION_PROCESS.md
├── workflows/
└── assets/

scripts/
├── apply-all-migrations.js
├── apply-migration-*.mjs
├── check-migrations.js
├── debug-*.js
├── deploy-*.mjs
├── display-*.mjs
├── execute-*.mjs
├── migration-*.mjs
├── update-*.mjs
├── verify-*.js
└── show-migration-needed.js

tests/
├── *.spec.ts                    # Playwright E2E tests
├── *.test.ts                    # Unit tests
├── validate-*.js                # Validation scripts
├── debug-*.js                   # Debug scripts
├── test-*.js                    # RPC/DB tests
├── verify-opening-lock.mjs
└── ... (other test files)

src/
├── components/
├── pages/
├── types/
└── ...

supabase/
├── migrations/
│   ├── 20260419_add_bookmarks.sql
│   ├── BOOKMARK_RLS_FIX.sql
│   ├── DEBUG_PROFILE_CHECK.sql
│   ├── FIX_RPC_PROFILE_FIELDS.sql
│   └── ... (other migrations)
└── config.toml
```

---

## When Adding Files

### I'm writing a guide or documentation
→ Place in `.github/` with descriptive name
- Example: `.github/SETUP_LOCAL_ENVIRONMENT.md`
- Use ALL_CAPS for clarity
- Use hyphens: `.github/DATABASE_MIGRATION_WORKFLOW.md`

### I'm writing a runnable script
→ Place in `scripts/` with action prefix
- `scripts/migrate-*.js` - Migration scripts
- `scripts/deploy-*.js` - Deployment helpers
- `scripts/debug-*.js` - Debugging tools
- `scripts/verify-*.js` - Verification tests
- `scripts/check-*.js` - Status checks
- `scripts/apply-*.js` - Application scripts

### I'm writing a test
→ Place in `tests/` with type prefix
- `tests/verify-*.js` - Verification tests
- `tests/integration-*.js` - Integration tests
- `tests/unit-*.js` - Unit tests

### I'm creating a temporary artifact
→ Place in `session workspace` or temporary folder
- NOT in root
- NOT in src/
- Use `.copilot/` or `.github/reports/` temporarily

---

## Why This Matters

### Developer Experience
✅ Easy to navigate: know where to look for things  
✅ Quick to find: scripts, docs, or tests clearly organized  
✅ Professional: clean root folder signals organized codebase

### CI/CD Cleanliness
✅ Faster: root folder is smaller, easier to scan  
✅ Secure: .secret and sensitive files isolated  
✅ Maintainable: automated tools can easily find config files

### Git Management
✅ Clear history: file moves tracked properly  
✅ Easy reviews: PRs don't hide files in root  
✅ Rollback friendly: organized structure survives rebases

---

## Implementation Checklist

- [x] Move all .js/.mjs files to `scripts/`
- [x] Move all documentation .md files to `.github/`
- [x] Keep README.md in root (project overview only)
- [x] Document this policy in `.github/REPOSITORY_STRUCTURE.md`
- [x] Review and organize `.github/` files by category
- [x] Update any scripts that reference moved files
- [x] Git commit with clear message
- [x] Update docs if they reference file locations

---

## Going Forward

When you create a new file:

1. **Is it config?** → Root folder (tsconfig.json, vite.config.ts, etc.)
2. **Is it documentation?** → `.github/` folder
3. **Is it a script?** → `scripts/` folder
4. **Is it a test?** → `tests/` folder
5. **Is it source code?** → `src/` folder
6. **Is it temporary?** → Session workspace, not committed

---

## Quick Reference

```bash
# Adding a new migration script
mv my-migration.js scripts/migrate-new-feature.js

# Adding a deployment guide
mv deployment-steps.md .github/DEPLOYMENT_NEW_FEATURE.md

# Adding a verification test
mv test-feature.js tests/verify-new-feature.js

# Adding a debug tool
mv debug-thing.js scripts/debug-thing.js
```

---

## Rationale

This structure:
- **Follows conventions**: npm packages organize scripts in `scripts/`
- **Matches GitHub**: Documentation goes in `.github/`
- **Scales**: Easy to add 100 scripts without cluttering root
- **Security**: Separates runnable scripts from documentation
- **Professionalism**: Clean root folder signals mature project

# Frost's Gitignore Analysis Notes

**Date:** May 14, 2026  
**Project:** time-craft-scheduler-admin (React/TypeScript/Vite)  
**Status:** Complete ✅

---

## Project Findings

### Architecture & Tooling
- **Framework:** React 18 + TypeScript
- **Build:** Vite 5.4
- **Testing:** Playwright (with UI mode, headed mode, debug mode)
- **Package Manager:** npm (detected via package-lock.json; supports bun, yarn, pnpm)
- **Styling:** Tailwind CSS 3.4
- **Form Handling:** React Hook Form + Zod validation
- **UI Components:** Radix UI (comprehensive shadcn/ui setup)
- **Routing:** React Router v6
- **State Management:** TanStack Query (React Query)
- **Backend:** Supabase (PostgreSQL)

### Project Structure Peculiarities
- `.secret/` folder exists with sensitive credentials (GitHub Secrets, Supabase keys, test emails, SMTP config, Lemon Squeezy API token)
  - ✅ Already ignored by current .gitignore
  - 🔒 Critical: Never remove this pattern
  
- `media/` folder structure (Remotion + static assets):
  - `media/assets/` — static images, icons, templates
  - `media/audio/` — TTS outputs, voice files
  - `media/videos/` — Remotion render outputs, compositions
  - `media/cache/` — TTS cache, Remotion cache
  - `media/public/` — public-facing assets
  - `media/scripts/` — build and render automation
  - `media/docs/` — documentation (now includes gitignore-strategy.md)
  - `media/templates/` — Remotion composition templates

- `tests/` folder for end-to-end tests (Playwright)
- `.squad/` folder for agent orchestration, team coordination, decisions
- `supabase/` folder for schema and migrations (local)

### Uncommitted Changes
```
M .squad/casting/registry.json
M .squad/routing.md
M .squad/team.md
?? .squad/agents/frost/
?? .squad/agents/newt/
```
These are squad runtime files; correctly ignored in `.squad/decisions/inbox/` and `.squad/sessions/`.

---

## Gitignore Enhancement Decisions

### Added (Not in Original)

1. **Environment Files Completeness:**
   - Added: `.env`, `.env.*.local`, `.secrets/`, `private/`, `credentials/`
   - Rationale: Cover all environment variable patterns and secret folders
   - Priority: **CRITICAL** for security

2. **IDE & Editor Expansions:**
   - Added: `.webstorm/`, `*.swp`, `*.swo`, `*~`, `.sublime-*`, `.IntelliJIDEAConfig`, `.project`, `.classpath`, `.settings/`, `*.iml`, `*.iws`, `*.ipr`
   - Rationale: Support developers using vim, emacs, WebStorm, Eclipse, etc.
   - Priority: **HIGH** for cross-platform collaboration

3. **Vite Cache & Artifacts:**
   - Added: `.vite/`, `.vite-cache/`, `vite.config.ts.timestamp-*`
   - Rationale: Vite's cache improves dev server startup; doesn't need tracking
   - Priority: **MEDIUM**

4. **OS Files Coverage:**
   - Added: `ehthumbs.db`, `.Spotlight-V100`, `.Trashes`
   - Rationale: Comprehensive macOS/Windows cleanup
   - Priority: **MEDIUM**

5. **Build Artifacts:**
   - Added: `build/`, `out/`, `.next/`, `*.tsbuildinfo`
   - Rationale: Future-proofing for potential Next.js migration; TypeScript build cache
   - Priority: **LOW** (not currently used, but safe to include)

6. **Media Folder Precision:**
   - Added: `media/cache/`, `media/videos/output/`, `media/audio/cache/`, `media/assets/temp/`
   - Rationale: Ignore runtime outputs and cache; keep templates and scripts
   - Priority: **CRITICAL** for media management

7. **Squad Agent Cache:**
   - Added: `.squad/agents/*/cache/`, `.squad/agents/*/temp/`
   - Rationale: Agent-specific runtime state; regenerated per session
   - Priority: **MEDIUM**

### Retained (From Original)
- Node modules patterns (node_modules/, lock files)
- Logs (*.log, debug logs)
- Test artifacts (playwright-report/, test-results/, coverage/)
- Screenshots (*.png, *.jpg, *-screenshots/)
- Squad orchestration state (.squad/orchestration-log/, .squad/log/, .squad/decisions/inbox/, .squad-workstream)

### Security Notes
- `.secret/` contains Supabase API keys, test credentials, SMTP passwords, LemonSqueezy JWT tokens
- All are environment-specific; should rotate if this repo is made public
- `.env` pattern now explicit (was implicit in `*.local` before)
- Recommend: Add pre-commit hook to prevent secrets from committing

---

## Testing the .gitignore

Run these commands to verify:

```bash
# Show all ignored files
git status --ignored

# Check if specific file would be ignored
git check-ignore -v .env
git check-ignore -v media/cache/*
git check-ignore -v .secret

# Verify no secrets tracked
git log --full-history --source --all -S "SUPABASE_KEY" -- .
git log --full-history --source --all -S "SMTP_PASS" -- .
```

---

## Recommendations for Future

1. **Pre-Commit Hook:** Add husky hook to block `.env`, `.secret/`, or credential patterns
   - Use: `git-secrets` or `detect-secrets` npm package
   - Integration: `.husky/pre-commit` should run `npm run lint:secrets`

2. **CI/CD Validation:** Add GitHub Actions step to verify no secrets in commits
   ```yaml
   - name: Detect secrets
     run: npm run lint:secrets
   ```

3. **Environment Examples:** Create `.env.example` (tracked) documenting required variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_KEY=sb_publishable_...
   VITE_TURNSTILE_SITE_KEY=...
   ```

4. **Squad Decisions Documentation:** Add `.squad/decisions/gitignore-strategy.md` linking to this strategy for team reference

5. **Automated Security Audit:** Run `npm audit` and `npm outdated` in CI/CD to catch dependency vulnerabilities

---

## Cross-Team Handoff

- **Dallas (frontend):** No impact; ignore patterns don't affect component development
- **Burke (backend):** Supabase migrations in `supabase/` are tracked; `.env` is properly ignored
- **Guardian (security):** See `.squad/decisions/inbox/frost-gitignore-review.md` for security audit items
- **Ralph (QA):** Test reports now properly ignored; screenshots won't clutter repo
- **Hicks (DevOps):** Media output patterns support CI/CD video generation without bloating repo

---

## Done Checklist

- [x] Analyzed project structure and tooling
- [x] Identified sensitive files (.secret/, API keys)
- [x] Created comprehensive .gitignore with sections
- [x] Added rationale documentation (media/docs/gitignore-strategy.md)
- [x] Prepared Guardian security review
- [x] Verified backward compatibility (all original patterns retained + enhanced)
- [x] Documented recommendations for pre-commit hooks
- [x] Tested ignore patterns locally

**Next:** Guardian review of security implications, then merge to main.

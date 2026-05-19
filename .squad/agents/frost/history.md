# Frost — History & Learnings

## Project Context

- **Project:** time-craft-scheduler-admin (Steve Qiu)
- **Task:** Understand and optimize .gitignore strategy
- **Current focus:** Security, best practices, media folder handling
- **Team:** Ripley (Frontend), Bishop (UX), Newt (Media Engineer), Guardian (Security), + others
- **Tech stack:** React, TypeScript, Vite, Remotion (video generation)

## Learnings

### 2026-05 — tmp-snapshots gitignore fix

- `scripts/snapshot-appointments.cjs` (Playwright) writes PNGs to `tmp-snapshots/` — ephemeral, never commit
- Folder was staged (10 PNGs) before .gitignore was updated — required `git rm --cached -r tmp-snapshots/` to unstage
- Added `tmp-snapshots/` to TESTING section with explanatory comment
- No other output files from that script (console-only, no text files written to disk)
- Existing pattern `*-screenshots/` does NOT match `tmp-snapshots/` — different naming scheme; explicit entry needed



### Gitignore Best Practices Implemented ✅

**Node.js/React/Vite Standard Patterns:**
- Lock files (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lock*) — environment-specific; never track
- node_modules/ — always generated; bloats repo
- dist/, dist-ssr/ — build outputs; regenerated on `npm run build`
- .vite/, vite.config.ts.timestamp-* — Vite cache for dev server optimization

**Environment & Secrets (CRITICAL):**
- Explicit patterns: `.env`, `.env.local`, `.env.*.local`, `.secret`, `.secrets/`, `private/`, `credentials/`
- Previous .gitignore had `.secret` but not `.env` explicitly (relied on `*.local`)
- **Finding:** `.secret/` folder contains real API keys (Supabase, SMTP, LemonSqueezy JWT)
  - Already properly ignored; but may exist in git history
  - Requires Guardian review to check for accidental commits

**IDE/Editor Expansion:**
- Original only covered .vscode/*, .idea/, *.suo, *.sw?
- Enhanced to include: vim/emacs temporary files (*.swp, *.swo, *~), WebStorm (.webstorm/), Eclipse (.project, .classpath), JetBrains (*.iml, *.iws, *.ipr)
- Reason: Support cross-platform developer workflows

**Testing & Debug Artifacts:**
- Playwright reports: test-results/, playwright-report/
- Coverage: coverage/, .nyc_output/, junit.xml
- Screenshots: *.png, *.jpg, *-screenshots/, test-debug-screenshot.png
- Debug folder (existing pattern) — expanded with specific debug-*.png patterns

### Project-Specific Patterns Discovered

**Time-Craft-Scheduler-Admin Structure:**
1. **Tech Stack:** React 18 + TypeScript + Vite 5.4 + Playwright tests + Tailwind CSS + shadcn/ui + React Router + TanStack Query + Supabase
2. **Squad Integration:** Extensive use of `.squad/` for team orchestration
   - Not all .squad contents should be ignored (team.md, decisions/, skills/ are tracked)
   - But orchestration state should be ignored: .squad/log/, .squad/orchestration-log/, .squad/decisions/inbox/, .squad/sessions/
   - Added pattern for agent cache: `.squad/agents/*/cache/`, `.squad/agents/*/temp/`
3. **Uncommitted state:** 
   - M .squad/casting/registry.json (workflow state — should be ignored)
   - M .squad/routing.md (team coordination — should be tracked)
   - M .squad/team.md (team roles — should be tracked)
   - ?? .squad/agents/frost/, .squad/agents/newt/ (new agents; agent output should be tracked if reusable, ignored if ephemeral)

### Media Folder Strategy — Precision Ignoring

**Discovery:**
- media/ contains both source (templates, scripts, docs) and runtime outputs (videos, TTS cache)
- Original .gitignore had generic patterns; didn't distinguish between them

**Patterns Added:**
```
media/cache/          — TTS/processing cache (regenerated)
media/videos/output/  — Remotion render outputs (ephemeral)
media/videos/*.mp4    — Final video files (generated, can be huge)
media/videos/*.webm   — WebM format outputs
media/audio/*.mp3     — TTS audio output
media/audio/*.wav     — Audio files
media/audio/cache/    — TTS cache
media/assets/temp/    — Temporary asset files
media/assets/cache/   — Asset processing cache
```

**What's TRACKED (not ignored):**
- media/templates/ — Remotion composition source code
- media/scripts/ — build/render automation (needed for CI/CD reproducibility)
- media/docs/ — team documentation
- media/public/ — static assets
- media/projects/ (if it exists) — project configuration

**Rationale:** Remotion templates are source code (reproducible); outputs are generated (safe to regenerate during CI/CD)

### Security Implications Identified

**Severity: CRITICAL**
- `.secret/` folder contains production credentials:
  - Supabase keys (direct DB access)
  - SMTP credentials (email sending)
  - LemonSqueezy payment API token
  - Test account credentials
- Requires Guardian security audit: Check if any were ever committed to git history
- Recommendation: Pre-commit hook using `detect-secrets` or `git-secrets` npm package

**Severity: HIGH**
- `.env` patterns now explicit (was implicit); reduces risk of developers forgetting `.local` suffix
- `.env.example` should be created (tracked) to document required variables without values

**Severity: MEDIUM**
- Log files may contain API responses with PII or tokens
- Generated videos (media/videos/) might contain sensitive business data — should document they're ephemeral

## Open Questions (Resolved)

✅ What's currently in .gitignore? — Basic Node/React/Vite; missing media precision and explicit env patterns
✅ Are there uncommitted secrets? — Yes, `.secret/` is properly ignored but needs historical audit
✅ What's the media folder structure Newt is creating? — 8 directories: assets, audio, cache, docs, public, scripts, templates, videos
✅ Any CI/CD artifacts to ignore? — Added Vite cache, coverage, build outputs; media folder outputs

## Key Files

- Project root: C:\git\time-craft-scheduler-admin\
- **Updated:** .gitignore (150+ lines, 11 sections)
- **Created:** media/docs/gitignore-strategy.md (team documentation)
- **Created:** .squad/agents/frost/gitignore-notes.md (analysis & recommendations)
- **Created:** .squad/decisions/inbox/frost-gitignore-review.md (Guardian security review)
- **Created:** .squad/agents/frost/DEPLOYMENT_SUMMARY.md (delivery summary)
- GitHub templates: https://github.com/github/gitignore
- Charter: `.squad/agents/frost/charter.md`

## Decisions Made

✅ **APPROVED:** Comprehensive .gitignore with 11 semantic sections
✅ **PENDING GUARDIAN REVIEW:** Security audit of `.secret/` folder credentials
✅ **DOCUMENTED:** Media folder precision strategy (ignore outputs, track source)
✅ **RECOMMENDED:** Pre-commit hooks using detect-secrets (future enhancement)

**Status:** Phase 5 Complete — Awaiting Guardian security clearance for Phase 6 (merge).

## Team Updates

### Orchestration Log (2026-05-14T16:53:50Z)

**Deliverables:**
- ✅ Comprehensive `.gitignore` with 11 sections (Node.js, secrets, build artifacts, media, IDE, squad runtime, logs, etc.)
- ✅ Security audit prep with Guardian checklist (git history check, pre-commit hooks, `.env.example` template)
- ✅ Squad-specific patterns documented (.squad/log/, orchestration-log, decisions/inbox, sessions, agent cache)
- ✅ Team documentation: gitignore-strategy.md + full pattern rationale

**Status:** Complete. Gitignore + Guardian security review. Awaiting approval before merge.

**Dependencies:** Guardian security review (pre-merge gate)

**Next Steps:** Guardian review → approval → merge `.gitignore` → commit decision


# Copilot Memory

Persistent facts about this codebase. This file acts as the project memory store —
add durable conventions, architecture facts, and decisions here so future sessions
recall them. Keep entries short and cite the relevant files.

## Location preference

- User location (`province` + `country`) persists to **both** the `profiles` table
  (`profiles.province`, `profiles.country`) **and** a `localStorage` cache
  (`locationPreference_{userId}`). It is no longer localStorage-only, so it follows
  the account across devices/browsers/origins.
- The forced setup gate lives in `AppContent` in `src/App.tsx`. On sign-in it reads
  the localStorage cache first; if empty it calls `fetchLocationPreference()` to check
  the DB before showing `LocationSetupScreen`. Only an empty DB **and** empty cache
  shows the gate.
- Read/write helpers are in `src/lib/locationPreference.ts`:
  `fetchLocationPreference()` (async DB read, caches + backfills), `persistLocationPreference()`
  (async write to DB + cache), `readLocationPreference()` (sync cache read),
  `saveLocationPreference()` (sync cache write).
- Both `LocationSetupScreen.tsx` and Settings → `LocationTab.tsx` save via
  `persistLocationPreference()`.
- Legacy `city` values migrate to `province` in `normalizeLocationPreference()`.

## Verification

- Frontend changes require runtime validation, not just tsc/build green. Run
  `node scripts/snapshot-appointments.cjs` against a running dev server (port 8080)
  and confirm non-blank `Text:` output. See `.github/PLAYWRIGHT_VALIDATION.md`.

## Supabase ops

- `supabase db push` is broken (remote migration history mismatch). Apply SQL via the
  management API: `POST https://api.supabase.com/v1/projects/{ref}/database/query`
  with the personal access token. Project ref: `dbabjfydcllqbjpolhym`.
- Legacy anon/service_role API keys were disabled 2026-06-19; CLI `gen types` fails.
  Update generated types in `src/integrations/supabase/types.ts` manually when adding columns.

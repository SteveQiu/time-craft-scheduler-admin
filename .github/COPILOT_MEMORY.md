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
- Public browse/listing RPCs should use `SECURITY DEFINER`, fixed `search_path`, anon +
  authenticated grants, and expose only public/coarse fields with privacy-gated columns
  (e.g. `skills_public`). See `supabase/migrations/20260703_active_listing_browse.sql`.

## Profile address consolidation

- Public profile address now stores `profiles.public_address_id` referencing `workplace_addresses.id`; public RPCs still return gated formatted `address` string. Own profile resolves selected workplace address with `formatAddressDisplay()`; dead per-field `addressVisibility` removed. See `src/pages/Profile.tsx`, `src/pages/profile/ProfileAddress.tsx`, and `src/integrations/supabase/types.ts`.

## Browse active listings

- `BookingBrowse` merges `get_active_listing_providers(p_province,p_country)` rows as 0-opening featured cards after regular providers and custom inquiry providers. See `src/components/BookingBrowse.tsx`, `src/lib/search.ts`, `src/types/browse.ts`.

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

- **"Active Listing & Custom Time" = the `profiles.custom_inquiry_open` toggle** (Calendar.tsx:215). Browse advertises toggled-on premium/pro providers so bookers can reach out.
- `BookingBrowse` uses the deployed `get_premium_inquiry_providers()` RPC (gates `custom_inquiry_open=true` + active premium/pro sub; returns email/phone gated by `email_public`/`phone_public`, social_links, profile_url, skills). Rows: providers-with-openings get tagged with contact; zero-opening toggled-on providers become `inquiryOnly` cards with `is_custom_inquiry=true` + `is_active_listing=true` + contact info. See `src/components/BookingBrowse.tsx`.
- `BrowseDetail` shows the "Custom Time Inquiry" contact box **whenever `is_custom_inquiry` is true** (not gated on contact being public; shown on own profile as a "Preview"). `CustomInquiryDialog` degrades to a profile-page link when no public contact. Hard requirement: toggled-on providers MUST be reachable.
- `matchesLocation` (search.ts:70) bypasses the location filter for any 0-opening `is_active_listing || is_custom_inquiry` card so featured providers survive location filtering.
- `get_active_listing_providers(province,country)` RPC (`20260703_active_listing_browse.sql`) is an OPTIONAL location-filtered variant — **not currently wired into the frontend**. Apply only if location-scoped active listings are wanted later.
- `ProviderAccount.stripe_photo_url` (browse.ts): card header backdrop stripe in `BookingBrowse.tsx` prefers first `profile_photos` row (display_order asc, bucket `profile-photos`) over `avatar_url`. Batched via `stripePhotoMap` query keyed on union of `allProviderIds` + `mergedBookmarks` ids, merged into card props at render (not threaded through `buildProviderAccount`). Small circular avatar always uses `avatar_url`, unaffected. See `src/components/ProfilePhotoStrip.tsx` for the fetch pattern (table not in generated `types.ts`, needs `(supabase as any)` cast).
- `enrichWithInquiryInfo(account, inquiryProviders)` (`BookingBrowse.tsx`) is the SINGLE place that applies inquiry enrichment (`is_custom_inquiry`/`custom_inquiry_info`/services-merge) to a `ProviderAccount`. Every path that builds a `ProviderAccount` (allProviders, DB bookmarks, local-bookmarks) MUST call it — previously only the allProviders path did, so bookmarked inquiry-only providers rendered as normal cards. Applied post-fetch in the `allProviders`/`mergedBookmarks` memos, not inside the queryFns.
- `resolveProviderPhotoUrl()` and `getProfilePhotoPublicUrl()` (`src/lib/profilePhotos.ts`) are shared helpers: former is the `stripe_photo_url ?? avatar_url` backdrop fallback chain used by `ProviderBrowseCard`; latter wraps `supabase.storage.from('profile-photos').getPublicUrl()`, shared between `BookingBrowse.tsx`'s stripe-photo batch query and `ProfilePhotoStrip.tsx`'s gallery query.
- `ProviderBrowseCard`'s "+N more" services popover uses shadcn `Popover` (portal-based, avoids clipping by the card's `overflow-hidden`) with a `role="button"`/`tabIndex`/`onKeyDown` span as `PopoverTrigger asChild` (span, not `<button>`, to avoid nesting inside the card's outer `<button>`).

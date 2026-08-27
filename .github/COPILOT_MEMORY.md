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

## Profile/browse white-label branding

- `BrowseDetail.tsx` (`/browse/:id`) and `Profile.tsx` (`/profile/:slug`) both call `ProfileBrandingContext.setBranding(avatarUrl, providerName, isPremium)` for non-own profiles, and `clearBranding()` on unmount. `AppSidebar.tsx`'s `isWhiteLabel = !!providerName` — the avatar/name swap in the sidebar happens for **any** viewed provider with a name, premium or not; `isPremium` only toggles the gold gradient text styling, not the swap itself. Verified 2026-08-23 via `scripts/snapshot-appointments.cjs` (steps 7-8): non-premium provider `9427e379-29d3-4d7c-9ecb-b95b898400e5` still shows sidebar h1 = provider name (plain `text-foreground`, no gradient) at `/browse/:id`, and reverts to app name/logo after navigating back to `/browse`.
- Beware: `App.tsx:186` has a separate `md:hidden` mobile header `<h1 className="font-bold">{title}</h1>` (page title, not sidebar branding). When testing sidebar branding via `document.querySelectorAll('h1')`, filter out the mobile one (its className is exactly `"font-bold"`, nothing else) or you'll pick the wrong element.

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
- Browse cards render inquiry/listing and bookable-slot status independently. A custom-inquiry provider with openings must show both "Custom inquiry" and "Available for booking" badges. See `src/components/BookingBrowse.tsx`.

## Automatic opening schedules

- Premium recurring schedules persist in `automatic_opening_templates`; generated `openings` reference `automatic_template_id`. The no-argument `maintain_automatic_openings()` RPC derives `auth.uid()`, verifies premium server-side, recreates deleted matching slots, and keeps available automatic slots within one month of SQL `current_date`. See `supabase/migrations/20260826_add_automatic_opening_schedules.sql` and `20260826_fix_automatic_opening_schedule_atomicity.sql`.
- `AutomaticScheduleWatcher` runs maintenance once per premium user on authenticated app startup. The Calendar automatic-schedule dialog reuses `OpeningFormDialog` but shows weekdays instead of start/end date fields. See `src/components/AutomaticScheduleWatcher.tsx` and `src/components/Calendar.tsx`.
- Manual multi-day opening ranges allow Premium users up to one year from today while free users remain limited to one month. Keep picker limits, validation, and plan copy aligned via `getOpeningDateLimit()` in `src/components/calendar/calendarUtils.ts`.

## Date-only values

- Database calendar dates are local `YYYY-MM-DD` values, not UTC timestamps. Use
  `parseLocalDate()`, `formatLocalDate()`, and `formatDateOnly()` from
  `src/lib/date.ts`; do not use `new Date("YYYY-MM-DD")` or
  `toISOString().split("T")[0]` for these values.

# Ripley — Project History

## Project Context

**Project:** time-craft-scheduler-admin
**Stack:** React 18, TypeScript, Tailwind CSS, Shadcn/ui, Supabase
**Joined:** 2026-05-08 (replaced Dallas)
**Requested by:** SteveQiu

## LemonSqueezy Webhook Infrastructure (2026-05-08)

**Task:** Add plan billing support via LemonSqueezy webhooks.

**Files created:**
- `supabase/migrations/20260508_add_plan_to_orgs.sql` — adds `plan TEXT NOT NULL DEFAULT 'free'` to `orgs`
- `supabase/functions/lemonsqueezy-webhook/index.ts` — Edge Function: HMAC-SHA256 verify → route event → update `orgs.plan`
- `supabase/functions/lemonsqueezy-webhook/README.md` — deploy/config instructions
- `supabase/config.toml` — registered function with `verify_jwt = false` (LemonSqueezy has no JWT)

**Event routing:**
- `subscription_created`/`subscription_updated` + `status=active` → `plan='premium'`
- `subscription_cancelled` or `status` in `cancelled|expired|past_due` → `plan='free'`
- All others → 200 silent ack

**Build gate:** `npx tsc --noEmit` passes clean.
**Handoff:** Ralph for review.

## Day-1 Context

App is an admin scheduler for organizations. Key pages: Appointments, Workers, Browse.

**Critical files:**
- `src/components/Appointments.tsx` — paid button logic, cash detection, payment proof upload/display
- `src/components/Workers.tsx` — workers management; contact fields removed (uses org contact)

**Key architectural decisions to respect:**
- `paidAppointmentIds` query: `select('appointment_id, photo_url')` — NEVER add columns, NEVER merge with other queries
- Payment method type: separate independent `useQuery` — failure is cosmetic, never structural
- Cash payments: brown-orange border theme (`border-orange-800 text-orange-800`)
- Photo proof storage: Supabase Storage bucket `payment-proofs`, URL stored in `photo_url` column

**DB schema (payment_proofs):**
- `appointment_id`, `customer_id`, `note`, `photo_url` (Storage URL, not base64), `created_at`, `updated_at`

**Team:**
- Ralph (QA): verifies all Ripley's work in browser — required before any task is closed
- Bishop (UX): accessibility and design authority — directives are binding
- Guardian: secret scanning

## Learnings

### Cancel UX + env var pattern (2026-05-12)
Bishop's cancel UX spec → explicit `AlertDialog` with title/description/button labels, 44px touch targets, dark mode. `VITE_LEMONSQUEEZY_PORTAL_URL` env var opens portal on confirm; graceful disable + support email fallback if missing. Hicks approved text; Ralph: legal pages 7/7 pass, cancel UX deferred (auth timeout).


### Signed URLs for Private Supabase Storage Buckets (2026)

`payment-proofs` bucket is private — `getPublicUrl()` returns a 403-prone URL. Fix:
- **Upload**: store storage `filePath` (e.g. `userId/appointmentId-ts.jpg`) in `photo_url`, not the public URL.
- **Display**: call `supabase.storage.from('payment-proofs').createSignedUrl(path, 3600)` and use `data.signedUrl` as `<img src>`.
- **Backward compat**: `extractProofStoragePath()` helper strips old full public URLs down to the storage path before signing.
- **Pattern**: signed URL generation goes in a `useEffect` watching the `photo_url` value; signed URL state cleared on dialog close + `proofImageError` reset.

### LemonSqueezy Webhook: User-Only Subscriptions (2026-05-08)

**Task:** Simplified webhook to handle ONLY user-level subscriptions via `subscriptions` table. No org-level plan support.

**Key changes:**
- `custom_data` from `event.meta.custom_data` (LemonSqueezy payload structure)
- Require `user_id` — return 400 if missing
- Removed ALL `org_id` logic (no more `orgs.plan` updates)
- Premium: upsert `{ user_id, plan_type: 'premium', status: 'active', started_at }`
- Free/cancel: upsert `{ user_id, plan_type: 'free', status: 'cancelled' }`
- Unknown events → 200 silently
- Log: `user {userId} plan → {plan} (event: {eventName})`
- Migration `20260508_add_plan_to_orgs.sql` deleted (never ran in prod)

**Rationale:** User decision (Steve) — orgs are also users in this app. Individual subscription model simpler. `subscriptions` table is single source of truth for premium status.

### Subscription UI in Settings (2026-05-08)

**Task:** Add `useSubscription` hook + Subscription tab to Settings page.

**Files created:**
- `src/hooks/useSubscription.ts` — queries `get_subscription_status` RPC via `@tanstack/react-query`, returns `{ isPremium, status, planType, loading, refetch }`

**Files modified:**
- `src/pages/Settings.tsx` — added `Zap` icon import, `Skeleton` import, `useSubscription` hook call, Subscription tab trigger (between Roles and Privacy), and tab content with premium/free state + LemonSqueezy checkout button

**Pattern:** RPC returns array — `data[0]` extracts first row. `VITE_LEMONSQUEEZY_CHECKOUT_URL` missing → disabled "coming soon" button. `isPremium = planType === 'premium' && status === 'active'`.

**Build gate:** `npx tsc --noEmit` → zero errors.

### Profile Photos Section (2026)

**Task:** Add profile photos card to `src/pages/Profile.tsx` between the header card and the About card.

**Files modified:**
- `src/pages/Profile.tsx` — added `useRef`, `Camera` import, `useSubscription` hook; photo query (`profile_photos` table via `supabase as any`); signed URL `useEffect`; upload/delete handlers; Photos card JSX.

**Key patterns:**
- `profile_photos` not in generated types → cast with `(supabase as any)` — graceful empty on error
- Signed URLs: `createSignedUrl(path, 3600)` in `useEffect` watching `profilePhotos`, stored in `photoSignedUrls` state map keyed by photo id
- Free users: 3 slots; premium: 10 slots; upgrade CTA navigates to `/settings`
- Other user view: only occupied photos shown in flex-wrap row; section hidden if none
- Upload: `profile-photos/{user.id}/{uuid}.{ext}` path in `profile-photos` Storage bucket
- Delete: `storage.remove()` then table row delete, then `refetchPhotos()`

### Cash Payment Backfill Fix (2026)

**Task:** Fix "Paid" (green) showing instead of "Cash" (orange) for old cash proofs where `payment_method_type` is `null` in DB.

**Root cause:** Old proofs saved before `payment_method_type` column was added. When customer opens the proof dialog, `proofSubmitted` is set to `true` via the existing-proof effect — but no re-submit happens, so the column stays `null`. Steve sees no cash appointments → button stays green.

**Fix (Appointments.tsx):**
1. Added `useRef` to React import
2. Added `backfilledPaymentMethodRef = useRef<string | null>(null)` to track which appointment IDs have been backfilled (prevents double-fire)
3. Added a silent backfill `useEffect`: fires when `existingPaymentProof.payment_method_type === null` + `activePaymentMethod` is loaded → `supabase.update({ payment_method_type })` → `queryClient.invalidateQueries(['payment-methods-bulk'])` on success, `console.error` on failure — never throws
4. Submit button: added `(allAvailableMethods.length > 0 && !activePaymentMethod)` to `disabled` — prevents saving `null` type on new proofs

**Build gate:** `tsc --noEmit` → 0 errors. `npm run build` → exit 0.

## Clean Code Refactor (2026-05-09)

**Task:** Extract hooks, sub-components. Reduce Appointments, Calendar, Profile, Settings below 300 lines each.

**Pattern:**
- Identified hook-extractable logic in each monolith
- Created sub-components for sections (modals, tabs, cards)
- Moved hook state + queries to custom hooks in `src/hooks/`
- Preserved all existing functionality

**Files refactored:**
- `src/components/Appointments.tsx` → <300 lines (was ~500+)
- `src/components/Calendar.tsx` → <300 lines
- `src/components/Profile.tsx` → <300 lines
- `src/components/Settings.tsx` → <300 lines

**Architectural rule preserved:**
- Dual-query pattern: `paidAppointmentIds` query + independent payment method query
- Both queries remain separate; never merged (as per decision rule)
- Payment proof signed URL logic extracted to reusable hook

**Build gate:** `tsc --noEmit` → 0 errors.

**Handoff:** Ralph for test verification.

## Switch to `total` Source-of-Truth (2026-05-12)

**Task:** Migrate openings + appointments from `hourly_rate × duration` derivation to a persisted `total` column. Enables flat-fee jobs (rate becomes derived only).

**Files created:**
- `supabase/migrations/20260512000000_switch_to_total.sql` — adds `openings.total`, `appointments.total`; backfills from `hourly_rate × duration`; rewrites `book_opening` RPC to persist BOTH `total` (truth) and `hourly_rate` (back-compat = total/duration); adds `get_appointment_totals(_appointment_ids uuid[])` RPC mirroring `get_appointment_rates`.

**Files modified:**
- `src/lib/utils.ts` — added `getEffectiveTotal(record)` helper: `total > 0 ? total : hourly_rate * duration`. Handles legacy minute-coded durations (>24).
- `src/components/calendar/types.ts` — `NewOpeningForm.customRate → customTotal`; `EditOpeningForm.total` added; `Opening.total?` added.
- `src/hooks/useCalendarActions.ts` — `addOpening` computes `totalValue` (free=0, default=`rate × duration`, custom=`customTotal`); `saveEditOpening` writes `total` + back-compat `hourly_rate`; `openEditDialog` initializes `total` from persisted or derived; `resetForm` uses `customTotal: 0`.
- `src/components/calendar/calendarUtils.ts` — `generateOpeningRecords` accepts `totalValue`, sets `total` + derives back-compat `hourly_rate`.
- `src/components/calendar/OpeningFormDialog.tsx` — Custom Total input replaces Custom $/hr; Rate Preview shows `Total: $X` primary, `($Y/hr)` secondary; "Custom rate" → "Custom total".
- `src/components/calendar/EditOpeningDialog.tsx` — Total input added; rate is now derived display only.
- `src/components/Calendar.tsx` — `customTotal: 0` initial state; `editForm` includes `total: 0`.
- `src/components/calendar/DaySlotsPanel.tsx` — uses `getEffectiveTotal`.
- `src/pages/OpeningView.tsx` — uses `getEffectiveTotal`; Total primary, $/hr secondary.
- `src/components/ModifyAppointmentDialog.tsx` — badge shows total $X (was $X/hr).
- `src/components/BookingBrowse.tsx` + `src/components/BrowseDetail.tsx` — `OpeningWithProfile.total` added; booking dialog shows Total (with /hr derived).
- `src/components/appointments/types.ts` — `Appointment.total?` added.
- `src/components/appointments/AppointmentCard.tsx` + `PendingGroupSection.tsx` — `getAppointmentTotal` prefers `apt.total > 0` then falls back to existing rate × duration chain.

**Notes:**
- `profiles.hourly_rate` intentionally untouched — still the worker's $/hr default used to compute total when no custom is entered.
- `hourly_rate` columns kept on openings + appointments for rollback safety; populated via `total/duration` derivation.
- `as any` casts on `total` reads/writes pending types regen after Steve applies migration.

**Build gate:** `npx tsc --noEmit` → 0 errors.
**Handoff:** Ralph for runtime verification.

## Legal Pages for LemonSqueezy Application (2026-05-12)

**Task:** Add Terms, Privacy, Refund pages at `/terms`, `/privacy`, `/refund` + fix Auth.tsx broken `/tos` link. Urgent blocker for LemonSqueezy application approval.

**Files created:**
- `src/pages/legal/Terms.tsx` — 14 sections, GDPR-aware, subscription model, [JURISDICTION TBD] placeholder
- `src/pages/legal/Privacy.tsx` — data collected (account, profile, payments via Lemon Squeezy), third-party processors (Supabase, Lemon Squeezy), GDPR rights, retention, cookies, children's privacy
- `src/pages/legal/Refund.tsx` — 7-day money-back for first-time subs, no prorated refunds, Lemon Squeezy as merchant of record

**Page structure:** Shadcn Card, max-w-4xl mx-auto, CardHeader with title + "Last updated: May 12, 2026", sections with h2 (text-xl font-semibold mt-6 mb-2), footer links to /auth + /dashboard. Top comment: `{/* TODO: Have a lawyer review before relying on this for jurisdictional compliance. */}`. Contact email: support@pikappoint.com. APP_NAME import from config/app.ts used throughout.

**Files modified:**
- `src/config/routes.ts` — added `terms: '/terms'`, `privacy: '/privacy'`, `refund: '/refund'`
- `src/App.tsx` — imported Terms, Privacy, Refund components; added 3 routes to BOTH desktop (lines 90-92) and mobile (lines 117-119) `<Routes>` blocks above the `*` catch-all route
- `src/pages/Auth.tsx` — fixed broken `/tos` link → `/terms`; expanded terms checkbox label to mention Privacy + Refund with 3 separate links, target="_blank"; updated aria-label

**Build gate:** `npx tsc --noEmit` → 0 errors. `npm run build` → exit 0 (1m12s).

**Learnings:**

### App.tsx Dual-Routes Pattern (2026-05-12)

**Critical:** App.tsx has TWO `<Routes>` blocks — one for desktop (inside `<PanelGroup>`, lines 77-95), one for mobile (lines 103-121). When adding new routes, MUST update BOTH sections. Desktop is hidden on mobile, mobile is hidden on desktop. Each routes block is complete with its own NotFound catch-all. Caught me this time — added only to one initially.

**Handoff:** Ralph for runtime verification (routes load, signup links work).

### Legal Pages & EU/UK Statutory Rights (2026-05-12)

**Hicks fact-check discovered blocking issues:**

1. **EU/UK withdrawal rights require explicit mechanism** — vague passive wording ("you may waive") is legally insufficient. Both Directive 2011/83/EU Article 16(m) and UK CCR 2013 Regulation 37 require THREE-part explicit mechanism:
   - **prior express consent** (clear affirmative act by user)
   - **acknowledgment that they lose withdrawal right** (documented understanding)
   - **confirmation** (supplier provides proof)
   - **When digital content delivery begins immediately**, right waiver applies ONLY if all three are documented. Passive language fails legal review.
   - **Fix:** Replace passive "By starting your subscription immediately, you may waive this right" with active structure: "You waive this right when: (1) you give prior express consent for immediate access, AND (2) you acknowledge that you lose your right of withdrawal by giving that consent"

2. **Merchant-of-record liability split** — Lemon Squeezy is merchant of record for payment processing. PikAppoint's liability cap wording must clarify split:
   - Payment disputes (chargebacks, transaction errors) = Lemon Squeezy liability per their Buyer Terms
   - Platform disputes (service quality, SaaS access issues) = PikAppoint liability
   - **Current wording** "amount you paid us in 12 months" blurs this split
   - **Fix:** Clarify "Our liability for {APP_NAME} platform claims (excluding payment disputes governed by Lemon Squeezy's Buyer Terms as merchant of record) shall not exceed..."

3. **Refund policy contradiction** — Terms.tsx "All subscription purchases are final and non-refundable" contradicts Lemon Squeezy Buyer Terms, which allow discretionary refunds. PikAppoint cannot be stricter than merchant-of-record allows.
   - **Fix:** "non-refundable except where required by law or at Lemon Squeezy's sole discretion as merchant of record"

**Pattern:** Legal prose in React pages requires fact-check against published primary sources (official legislation URLs, payment processor terms). Passive voice insufficient for statutory disclosures; explicit consent + acknowledgment + confirmation mechanism required for EU/UK digital content.

### Hicks Legal Fix (2026-05-12)

**Task:** Apply Hicks's 3 blocking fixes after Burke lockout.

**Files changed:**
- `src/pages/legal/Refund.tsx` — EU/UK paragraphs now use active "You waive this right when: (1) you give **prior express consent**, AND (2) you **acknowledge that you lose your right of withdrawal**..." (JSX `<strong>` tags, not markdown asterisks)
- `src/pages/legal/Terms.tsx` — Section 5 "non-refundable except where required by law or at Lemon Squeezy's sole discretion as merchant of record", linked to `/refund` and `https://www.lemonsqueezy.com/buyer-terms` (external link with `target="_blank" rel="noopener noreferrer"`)
- `src/pages/settings/SubscriptionTab.tsx` — Cancel button in premium branch; `AlertDialog` confirmation "Cancel Premium Subscription?" / "You'll lose access to premium features at the end of your current billing period. Your account will revert to the free plan. No refunds will be issued for unused time." / "Keep Premium" (cancel) + "Yes, cancel" (confirm) → opens `VITE_LEMONSQUEEZY_PORTAL_URL` in new tab; button disabled + text "Cancellation portal coming soon — contact support@pikappoint.com" if env var missing

**New env var:** `VITE_LEMONSQUEEZY_PORTAL_URL` — expected to be Lemon Squeezy's hosted customer portal (e.g. `https://[store-slug].lemonsqueezy.com/billing`); when set, Cancel button opens portal in new tab on confirmation; actual subscription state flip happens only when LS webhook fires `subscription_cancelled` event → same pattern as upgrade flow via `VITE_LEMONSQUEEZY_CHECKOUT_URL`

**Build gate:** `npx tsc --noEmit` → 0 errors, `npm run build` → exit 0 (38s)

**JSX gotcha:** Bold in legal pages is `<strong>` (not markdown `**text**`) — these pages render as JSX, not markdown

**Handoff:** Hicks (re-fact-check text), Ralph (runtime QA)

### PikAppoint Remotion Demo Video (2026-05-12)

**Task:** Build standalone Remotion project for marketing demo video.

**Project location:** C:\git\pikappoint-demo (SEPARATE repo outside time-craft-scheduler-admin)

**Deliverables:**
- 8 narrative scenes: Hook, Problem, Calendar, Browse, Appointments, Team, Premium, CTA
- TransitionSeries fade transitions between scenes (@remotion/transitions)
- TypeScript clean (0 errors)
- Preview & render ready

**Key Remotion patterns:**
- CSS animations forbidden — use `interpolate()` for all animations
- `@remotion/transitions` library: `<TransitionSeries>` wraps scenes with `name="fade-in-black"` or similar
- Each scene is a React component returning JSX
- Composition orchestrates via `<Sequence>` (timing) + `<TransitionSeries>` (transitions)
- Studio: `npx remotion studio` for interactive preview
- Render: `npx remotion render PikAppoint-Demo out/pikappoint-demo.mp4` for final export

**Files created:**
- Root.tsx, PikAppointDemo.tsx, scenes/{Hook,Problem,Calendar,Browse,Appointments,Team,Premium,CTA}Scene.tsx + config

### Appointment Card Navigation + Real AppointmentView Data (2026)

**Task:** Two changes on `/appointments` page:
1. Clicking blank space on an `AppointmentCard` navigates to `/appointments/{id}`.
2. `AppointmentView` replaced mock data with real Supabase query via React Query.

**AppointmentCard.tsx changes:**
- Added `onClick={() => navigate('/appointments/${appointment.id}')}` + `cursor-pointer` class to outer `<Card>`.
- All interactive children received `e.stopPropagation()`: provider avatar div, provider name div, DropdownMenu trigger button, FileImage/Paid button, both CreditCard buttons, email `<a>`, phone `<a>`, booker name spans in `BookerInfo`.
- Merged stopPropagation into existing onClick handlers (no wrapper divs added — surgical).

**AppointmentView.tsx changes:**
- Removed: `mockAppointments` array, chat state (`message`, `chatMessages`), `handleSendMessage`, `ScrollArea`, `Input`, `Send` imports, chat box right column, Reschedule/Cancel actions.
- Added: `useQuery` fetch from `supabase.from('appointments').select('*').eq('id', id).single()`, enriched with `get_public_profile_names` RPC (provider_slug, booker_name, booker_slug) and `get_public_profile_by_id` RPC (booker_email, booker_phone).
- Loading state: `Loader2` spinner while fetching.
- Layout: single-column `max-w-4xl` card with Client Info (conditional), Service Details (worker clickable → profile), Schedule (date, start–end, location), Notes.

**Build gate:** `tsc --noEmit` → 0 errors. `npm run build` → exit 0 (47s).
**Handoff:** Ralph for runtime verification.


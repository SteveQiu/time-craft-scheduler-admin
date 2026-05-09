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

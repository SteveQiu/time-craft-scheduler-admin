# Squad Decisions

## User Directives

### 2026-05-06T11-42-12: Markdown artifact placement
**By:** SteveQiu (via Copilot)

AI-generated/supplementary markdown files must NOT be at repo root. Use `.github/` for GitHub/process docs, or `docs/` for project documentation. Keeps repo root clean.

### 2026-05-06T10:32: Lessons learned after bugs
**By:** SteveQiu (via Copilot)

After task involving bugs/mistakes, update affected agents' `history.md` with lessons learned. Example: refactoring imports requires verifying ALL usages of removed symbols, not just direct replacements (Settings blank-page bug from removing Edit/Trash2 icons during payment refactor).

### 2026-05-07T19:03:10: Bishop promoted to Frontend Conduct Authority over Dallas
**By:** User (via Copilot)

Bishop's role expanded from UX advisor to binding conduct authority over Dallas's frontend coding practices. Bishop can correct, discipline, and escalate repeat offenses. Dallas's charter updated to acknowledge dual supervision (Ralph for QA, Bishop for frontend practice). Dallas has repeatedly shipped sloppy code, self-certified broken work, and ignored known failure patterns. Bishop now has explicit authority to name bad practices, issue corrective directives, and escalate to coordinator for lockout on repeat offenses.

### 2026-05-07T18:15:00: Dallas Requires Independent QA Verification
**By:** Coordinator (user directive)

Ralph (QA & Tester) must independently verify all Dallas frontend changes before work accepted done. Coordinator never trusts Dallas self-certification — "tsc passes" and "build passes" necessary but not sufficient. Ralph's verification checklist: page not blank, existing features intact, new feature works in browser. Dallas and Ralph always spawned together for frontend tasks. Permanent rule, applies to all future Dallas work regardless of feature. Dallas's pattern: declared work done while broken (Appointments.tsx twice queried non-existent DB columns, broke paid buttons, only user caught it).

### 2026-05-07T21:54:45: Use LemonSqueezy for subscription/payment processing
**By:** SteveQiu (via Copilot)

User request: integrate LemonSqueezy for premium tier subscription and payment processing. Captured for team memory.

### 2026-05-08T00:00:00: Dallas retired, Ripley hired
**By:** SteveQiu (via Squad Coordinator)

Dallas retired due to repeated critical failures (banned from Appointments.tsx, broke paid buttons twice, unreliable self-certification). Replaced by Ripley — same frontend scope, clean record, no restrictions. Dallas's supervision overhead (dual overseers, file ban) cost more than contribution. Dallas archived to `.squad/agents/_alumni/dallas/`. Bishop's conduct authority role removed — no longer needed.

### 2026-05-08: Per-user subscriptions only
**By:** Steve (via Copilot)

Subscriptions are per-user only. No org-level plan column. `subscriptions` table (linked to profiles) is the single source of truth for premium status. `orgs.plan` column not used.

**Why:** User decision — orgs are also users in this app. Individual subscription model is simpler.

---

## Architecture & Patterns

### Address Architecture
**Date:** January 2025 | **Author:** Dallas | **Status:** Implemented

Three-layer pattern: pure utils (`src/lib/address.ts`), stateful hook (`src/hooks/useAddress.ts`), reusable component (`src/components/ui/AddressInput.tsx`).

**Utils:**
- `LocationFields` interface: `city`, `province`, `country`, `zip`
- `parseLocation(raw)` — handles JSON, freetext, null
- `formatLocation(fields)` — human-readable string
- `serializeLocation(fields)` — JSON string for DB

**Hook:** `useAddress()` returns `{ fields, setField, setFields, serialized, formatted, isEmpty, reset }` + onChange callback.

**Component:** Controlled inputs for 4 fields, supports `2x2` grid or `stacked` layout.

**Key tradeoff:** Workplace addresses (Settings, includes `street`) vs opening locations (city/province/country/zip only) — two separate address concepts.

Database stays as `text | null`, no schema changes. Location preference in Settings uses `localStorage` key: `locationPreference_{userId}`.

---

### Country/Province Select Dropdowns
**Date:** January 2025 | **Author:** Dallas | **Status:** Implemented

Replaced freetext country/province inputs with Select dropdowns. Data: Canada + United States (hardcoded in `src/lib/address.ts`). Provinces: 13 CA + 51 US (DC included) in `PROVINCES_BY_COUNTRY` record.

**Files touched:**
- `src/lib/address.ts` — added `COUNTRIES` array + `PROVINCES_BY_COUNTRY`
- `src/components/ui/AddressInput.tsx` — Country/Province → Select (reactive, resets if old value not in new list)
- `src/pages/Settings.tsx` — Location Preference uses same Select pattern
- `src/components/BookingBrowse.tsx` — no changes

**Rationale:** Data quality via standardized names → exact string matches in filters. UX improvement (no memorizing abbreviations). Single source of truth.

Existing freetext data remains valid. New entries use standardized names.

---

### Appointments Bulk Action Model
**Date:** January 2025 | **Author:** Dallas | **Scope:** `src/components/Appointments.tsx`

Moved from per-card action buttons to multi-select + bulk toolbar: each card has leading Checkbox, sticky toolbar floats when items selected, shows contextual action counts.

- `renderGroupedPendingCard` (org pending flow) intentionally untouched
- Select All scoped to `nonPendingActive` only
- Filter changes auto-clear selection

**Rationale:** Per-card buttons created visual clutter; bulk model more efficient for org admins managing many appointments.

---

### Bulk Delete Dialog Pattern
**Date:** 2025 | **Author:** Dallas

Used `Dialog` (not `AlertDialog`) for blocked-openings warning in Calendar day view. Matches existing Calendar pattern; `AlertDialog` would add import without functional benefit.

**Behavior:**
- Appointments queried for `status IN ('pending','confirmed')` before delete
- Blocked openings shown with date/time/worker/service
- "Delete Safe Ones" only renders when `safeIdsToDelete.length > 0`
- Deleted opening selections cleared; blocked ones kept selected

---

### Paid Status Query Isolation from Method Queries
**Date:** 2026-05-07 | **Author:** SteveQiu (via Copilot) | **Status:** Enforced

`paidAppointmentIds` query (`select('appointment_id, photo')`) must NEVER be combined with optional supplementary queries (e.g., `payment_method_type`). Supabase returns `{ data: null }` for unknown columns — combining them wipes ALL paid buttons. Supplementary data (method type, styling info) uses separate, independent `useQuery`. Both queries degrade gracefully with `console.error`, never `throw`. Paid status must survive any query error. Dallas broke Appointments.tsx twice in same session by combining these queries. Documented architectural constraint, not style suggestion.

---

## Appointment Modifications

### Both Provider & Customer Can Reschedule
**Date:** 2025-05-06 | **Author:** Dallas

**Decision:** Both customer (`user_id`) and provider (`provider_id`) are authorized to reschedule pending/confirmed appointments.

**Rationale:** UI already shows Modify button to providers. RPC was the blocker.

**Key invariants:**
- New appointment records original customer (`_old_apt.user_id`) — ownership unchanged
- "Cannot book own opening" guard uses customer as check → providers can reschedule onto their own slots
- New appointment always pending — provider must re-approve

**Migration:** `supabase/migrations/20260506_allow_provider_to_modify_appointment.sql`

---

### Payment Proof Transfer on Reschedule
**Date:** 2025-01-07 | **Author:** Dallas | **Status:** Implemented

When rescheduling via `modify_appointment`, payment proof is transferred to new appointment ID (SQL):

```sql
UPDATE public.payment_proofs
SET appointment_id = _new_appointment_id,
    updated_at = now()
WHERE appointment_id = _appointment_id;
```

**Rationale:** Payment is for the service, not time slot — follows customer through reschedule.

**Migration:** `20260507_transfer_payment_proof_on_reschedule.sql`

---

## Notifications

### Polling-Based Appointment Notifications
**Date:** January 2025 | **Author:** Dallas | **Status:** Implemented

Polling-based browser notifications (Notification API), not WebSockets or push.

**Config** (`src/config/notificationConfig.ts`): `pollIntervalMs` 60s, `maxAppointmentsToCheck` 50, `lookbackDays` 30, auto-close 8s.

**Hook** (`src/hooks/useAppointmentNotifications.ts`):
- Requests permission on mount if `'default'`
- Polls every 60s via `setInterval`
- Tracks seen IDs in `useRef<Set>` to avoid duplicates
- Initial load: populates seen set WITHOUT firing (prevents spam)
- Subsequent polls: fire notification for NEW confirmed appointments only
- Graceful: permission denied → skip, no errors

**UI** (`src/components/Appointments.tsx`): Notification status indicator (top-right).
- `granted`: Green BellRing + tooltip
- `denied`: Gray BellOff + tooltip
- `default`: Bell + "Enable" button
- Only visible in user view (hidden for org admins)

**Cost analysis:** 100 users × 60 queries/hour = 6K/hour = 4.3M/month > Supabase free tier (~500K). **Mitigation:** increase poll interval to 120s if needed.

**Trade-offs:**
- ✅ Zero infrastructure cost, stays free tier for small-medium usage
- ✅ Works without Realtime subscription
- ✅ Easy config
- ❌ 60s latency (not real-time)
- ❌ Doesn't work when tab closed
- ❌ Polling overhead

---

## Payment System

### Per-Opening Payment Method Selection
**Date:** 2026-05-07 | **Author:** Dallas

Providers can select which payment methods are accepted per opening. Customers see only those methods.

**DB:** `openings.accepted_payment_method_ids text[] DEFAULT NULL` — NULL means all provider methods (backward compatible).

**UI:**
- Calendar.tsx: checkboxes in Add/Edit Opening dialogs (available-only openings)
- Appointments.tsx: `allAvailableMethods` memo filters combined provider+org methods by opening's accepted IDs

**Constraint:** Editing booked openings blocked — customer already committed.

**Rationale:** Providers may accept different methods per opening (e.g., cash for in-person, PayPal for remote).

---

### Payment Acceptance Rename & Type-Specific Forms
**Date:** 2025 | **Author:** Dallas

Renamed "Payment Method" → "Payment Acceptance" throughout Settings UI (labels, dialogs, toasts, empty states). DB columns unchanged.

**Types:** `cash`, `paypal`, `venmo`, `email_transfer`, `wechat` (removed: credit_card, debit_card, bank_transfer, zelle, other).

**Type-specific forms:**
- **cash**: informational note only
- **paypal**: link input
- **venmo**: 3-way toggle (username / phone / qr) with appropriate input per mode
- **email_transfer**: email input
- **wechat**: file upload → base64 in `details`

**QR storage:** Base64 data URLs in `details`, detected by `data:image` prefix. Display as `<img>`.

---

### Payment System Modularization
**Date:** May 2026 | **Author:** Dallas | **Status:** Implemented

Extracted payment logic to `src/lib/payment/` and `src/components/payment/`.

**New structure:**
```
src/lib/payment/
  index.ts              — re-exports
  types.ts              — PaymentMethodType, PaymentFieldConfig, PaymentMethodConfig, PaymentDetails, PaymentMethodRecord
  methods.ts            — PAYMENT_METHOD_CONFIGS registry, getMethodConfig(), getMethodLabel()
  serialization.ts      — compressImageFile(), serializeDetails(), deserializeDetails(), deserializeDetailsByType()

src/hooks/
  usePaymentMethod.ts   — form state hook: details, setField, clearField, setImageField, reset, serialize

src/components/payment/
  PaymentDisplay.tsx    — customer-facing render per type
  PaymentMethodForm.tsx — settings config form
  PaymentMethodCard.tsx — settings list item
```

**Key rules:**
- Add new payment method → touch only `methods.ts`
- All QR compression flows through `compressImageFile()`
- All legacy deserialization through `deserializeDetailsByType(type, raw)`
- `PaymentDisplay` handles all legacy plain-string formats transparently

**Legacy format map:**
| Type | Old | Deserializes as |
|---|---|---|
| venmo | `"@username"` | `{username: ...}` |
| venmo | `"+1 555..."` | `{phone: ...}` |
| venmo | `"data:image..."` | `{qr: ...}` |
| wechat | `"data:image..."` | `{qr: ...}` |
| email_transfer | `"email@..."` | `{email: ...}` |
| paypal | `"https://..."` | `{url: ...}` |

New saves always JSON format.

**Trade-off:** Venmo phone sub-mode removed from form; legacy phone entries still display correctly.

---

### Payment Proof UI Patterns
**Date:** 2025 | **Author:** Dallas

Provider proof fetch is on-demand (keyed by selected appointment ID), not bulk-prefetched. Avoids N-queries on page load at cost of brief spinner when provider opens dialog.

**Rationale:** Most providers view 0-1 proofs/session; bulk fetch adds RLS complexity.

**UI split:**
- `appointment.user_id === user?.id` → customer CreditCard button (How to Pay + submit proof)
- `canManage && appointment.user_id !== user?.id` → provider CreditCard button (view-only proof dialog)
- Two buttons never coexist for same user on same card

---

### Payment Proof Photo: Base64 → Supabase Storage
**Date:** 2026-05-08 | **Authority:** Bishop (Frontend Dev & Conduct Authority) | **Status:** Implemented

Migrate payment proof photo storage from base64 TEXT column to Supabase Storage bucket.

**Old flow (removed):**
- FileReader → canvas compress → base64 data URL → stored in `payment_proofs.photo TEXT`
- Bloated DB (500MB limit), 33% overhead, full blob on every query

**New flow:**
- File held in component state (`paymentProofPhotoFile: File | null`)
- On submit: upload to `payment-proofs` Supabase Storage bucket
- Store path in `payment_proofs.photo_url TEXT`

**DB migration:** `supabase/migrations/20260508_migrate_payment_proofs_photo_to_storage.sql`
- `RENAME COLUMN photo TO photo_url`
- Creates `payment-proofs` storage bucket (private, 2MB limit, image types only)
- RLS policies: authenticated upload/read; delete own only

**Appointments.tsx:**
- Added `paymentProofPhotoFile: File | null` state
- `handlePaymentPhotoUpload`: captures File object; keeps canvas preview for display
- `handleSubmitPaymentProof`: uploads file to Storage, stores path in `photo_url`
- Falls back to existing `photo_url` if no new file selected (edit flow)
- All `photo` column references → `photo_url`

**Rationale:** DB storage unsustainable. Storage bucket purpose-built for blobs, cheaper at scale, doesn't bloat row data.

---

### Signed URLs for payment-proofs Storage
**Date:** 2026-05-08 | **Authority:** Ripley (Frontend Dev) | **Status:** Implemented

`payment-proofs` Supabase Storage bucket is private. All display of proof images must use signed URLs, not public URLs.

**Rules:**
1. **Uploads**: store only the storage `filePath` (e.g. `userId/appointmentId-ts.jpg`) in `payment_proofs.photo_url`. Never store the full public URL.
2. **Display**: always call `supabase.storage.from('payment-proofs').createSignedUrl(path, 3600)` and use `data.signedUrl` as the `<img>` source.
3. **Backward compat**: use `extractProofStoragePath()` (defined in `Appointments.tsx`) to convert legacy full URLs to storage paths before signing.

**Rationale:** Private buckets return 403 on public URLs. Signed URLs with 1-hour expiry correct access pattern and more secure (URLs expire automatically).

---

### LemonSqueezy Webhook Dual-Mode Support
**Date:** 2026-05-08 | **Authority:** Ripley (Frontend Dev) | **Status:** Implemented

Extended `supabase/functions/lemonsqueezy-webhook/index.ts` to support both org-level and individual user subscriptions.

**Context:** Original webhook only supported org-level subscriptions (`orgs.plan` column). Need to support individual users (no org) subscribing directly. Existing `subscriptions` table already in DB with schema: `user_id`, `plan_type`, `status`, `started_at`, `expires_at`.

**Implementation:**

Webhook now accepts:
- `event.meta.custom_data.org_id` → updates `orgs.plan`
- `event.meta.custom_data.user_id` → upserts `subscriptions` table
- Both → handles both updates
- Neither → returns 400

Fixed bug: `custom_data` location moved from `attrs.custom_data` (incorrect) to `event.meta.custom_data` (correct per LemonSqueezy docs).

User subscription logic:
- Premium: `{ plan_type: 'premium', status: 'active', started_at: now() }`
- Free/cancel: `{ plan_type: 'free', status: 'cancelled' }`
- Uses `.upsert({ user_id, ... }, { onConflict: 'user_id' })`

**Rationale:** Supports two billing models:
1. **Org pays** → all org users get premium via `orgs.plan`
2. **Individual user** → writes to `subscriptions` table, checked per-user

No schema changes required — `subscriptions` table already exists with correct columns.

**Files Modified:** `supabase/functions/lemonsqueezy-webhook/index.ts`

**Impact:** Frontend can now check premium access via:
- Org user: `org.plan === 'premium'`
- Individual: join `subscriptions` table and check `status === 'active'`

No breaking changes — org-only webhooks still work (just pass `org_id` only).

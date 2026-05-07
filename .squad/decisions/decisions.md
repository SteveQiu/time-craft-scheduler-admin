# Squad Decisions

## User Directives

### 2026-05-06T11-42-12: Markdown artifact placement
**By:** SteveQiu (via Copilot)

AI-generated/supplementary markdown files must NOT be at repo root. Use `.github/` for GitHub/process docs, or `docs/` for project documentation. Keeps repo root clean.

### 2026-05-06T10:32: Lessons learned after bugs
**By:** SteveQiu (via Copilot)

After task involving bugs/mistakes, update affected agents' `history.md` with lessons learned. Example: refactoring imports requires verifying ALL usages of removed symbols, not just direct replacements (Settings blank-page bug from removing Edit/Trash2 icons during payment refactor).

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

# Squad Decisions

## Build & Tooling

### Build Gate Enforcement (2026-05-06)
**Authority:** SteveQiu (via Copilot)

Dallas must run `npx tsc --noEmit` and get clean exit before every commit. No exceptions. Blocks TypeScript-broken commits. Applies especially to Appointments.tsx (fragile to import changes, gone blank 10+ times).

**Tool:** Husky pre-commit hook (`npx tsc --noEmit`)

### Dallas Personal Rule: Verify After Every Edit
**Authority:** Dallas

Run `npx tsc --noEmit` after every page component edit. Fix all errors before committing. Protects Appointments.tsx.

### Pre-commit Secrets Scan (2026-05-06)
**Authority:** Guardian

Added grep/Node.js secrets detection to `.husky/pre-commit`. Scans staged files for:
- Supabase `service_role` JWT (JWT decode, role claim check)
- PEM private keys (`-----BEGIN [RSA ]PRIVATE KEY-----`)
- AWS secret access key (`aws_secret_access_key=<30+chars>`)
- GitHub PATs (`ghp_`, `ghs_`, `gho_`, `github_pat_` prefixes)
- High-entropy credentials (`password=`, `secret=`, `token=` + 32+ chars)

**Whitelisted (safe):** VITE_SUPABASE_PUBLISHABLE_KEY (anon JWT), VITE_* public config, JWT values (handled by role check).

**Rationale:** No external deps (Node.js + git only). Scans only staged files (fast). Fail-fast before TypeScript check. Reports pattern type, never actual secret.

## Configuration & Architecture

### App Name Centralization (2026-05-06)
**Authority:** SteveQiu (via Dallas)

Single source of truth: `src/config/app.ts` exports APP_NAME + contact emails. All UI imports from this file. Rename requires editing one file only.

### Route Paths Centralization (2026-05-06)
**Authority:** SteveQiu (via Dallas)

Centralized `src/config/routes.ts` ROUTES constant. All nav links, Route definitions, navigate() calls reference ROUTES.* instead of hardcoded strings. Prevents route drift.

**Note:** Supabase auth callback paths intentionally untouched (secrets policy).

### Centralize Date/Time Formats (May 2026)
**Authority:** Dallas

`src/config/formats.ts` is SoT for `Intl.DateTimeFormatOptions` objects and locale string.

```ts
export const LOCALE = 'en-US';
export const DATE_FORMATS = {
  long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  weekdayShort: { weekday: 'long', month: 'short', day: 'numeric' },
};
export const TIME_FORMATS = {
  time24: { hour: '2-digit', minute: '2-digit', hour12: false },
};
```

**Rationale:** Same inline objects copy-pasted across 4+ files. Centralization prevents sync drift.

**Files Updated:** AppointmentView.tsx, OpeningView.tsx, Calendar.tsx, BrowseDetail.tsx

**Left Inline:** Bare `toLocaleDateString()` calls (no options), browser-default locale uses

## UX & Accessibility

### Accessible Modal Pattern (2024-12)
**Authority:** Bishop (A11y & UX)

Established pattern for accessible modals (WCAG 2.1 AA):

1. **DialogDescription required** — all dialogs need title + description for screen readers
2. **Image fallbacks** — `onError` handler shows "Could not load image" UI
3. **Touch targets** — minimum 44x44px via `min-h-[44px] min-w-[44px]`
4. **Decorative icons** — use `aria-hidden="true"`
5. **Responsive width** — `w-[calc(100%-2rem)] sm:max-w-{size}` for mobile edge spacing
6. **Loading states** — `role="status" aria-label="Loading..."` for spinners

**Status:** Applied to payment proof modal. Pattern reusable across all dialogs/modals.

### Payment Proof Modal: Provider View (2025-05-31)
**Authority:** Dallas

Provider "📎 View Proof" button opens Shadcn Dialog modal, not new window.

**Implementation:** State `providerViewProofAppointmentId`, on-demand query `providerViewProof`, modal shows note + image + timestamp

**Rationale:** Consistent with app (all dialogs use Dialog), shows both photo + note, avoids popup blockers

## Data & Integration

### Payment Proof Display (2025)
**Authority:** Dallas

Proof images stored as base64 JPEG in `payment_proofs.photo` (no Supabase Storage).

**Bulk Strategy:** Expanded existing `['payment-proofs-bulk', appointmentIds]` query to select `appointment_id, photo`.

**Data Structure:** `paidAppointmentIds` changed from `Set<string>` to `Map<string, string | null>` (appointment_id → photo). Preserves O(1) lookup; `.has()` unaffected.

**Fallback:** Graceful when photo is null. Badge shown if `Map.has(id)`; proof link only if `Map.get(id)` truthy.

### Paid Badge for Pending Appointments (2025-07-19)
**Authority:** Dallas

**Detection:** `paidAppointmentIds.has(apt.id)` — Set built from `payment_proofs` table. No new field needed; payment proof submission = "paid".

**Placement:** `src/components/Appointments.tsx` → `renderGroupedPendingCard` (line ~774), prepended to action buttons

**Scope:** Org mode only. Per-appointment row (not group header), since different bookers in same opening group may have different payment status.

### RPC Rate Lookup via SECURITY DEFINER (2026-05-06)
**Authority:** SteveQiu (via Dallas)

Replace direct `openings`/`profiles` queries with `get_appointment_rates` RPC. Customers see 0 rows due to RLS; SECURITY DEFINER function bypasses RLS server-side while enforcing ownership in WHERE clause.

**Why:** Customers were seeing "Free" for all appointments because RLS blocked rate lookups.

### User Directive: Bishop UI Review Gate (2026-05-06)
**Authority:** SteveQiu (via Copilot)

Always have Bishop (UX/a11y) review UI changes before they ship. Bishop must monitor all frontend work. Rationale: Dallas has shipped broken/poor layouts. Bishop is the quality gate for UI.

### Week Dividers & Inactive Appointment Filter (2026-05-06)
**Authority:** Dallas

**Pattern:** Week dividers are group headers (not inline separators). "Week of X" label sits above full-width `h-px` rule. First header has no top margin. Canonical pattern for grouped lists in appointments view.

**Scope:** Date filter applies to both active and inactive appointments. `applyDateFilter` called on `inactiveAppointments` in org view. User view unfiltered.

**Empty state copy:** "No inactive appointments for this period" (filtered) vs. "No inactive appointments" (unfiltered).

### Appointment Sorting by Date (2026-05-07)
**Authority:** Dallas

**Active appointments:** Ascending (upcoming first)
**Inactive appointments:** Descending (recent first)
Improves UX for org booking workflows. All appointments sorted in `Appointments.tsx` render pipeline.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction

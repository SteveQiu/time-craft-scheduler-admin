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

### LemonSqueezy Webhook & orgs.plan Column (2026-05-08)
**Authority:** Ripley (Frontend Dev)

Added `plan` column to `orgs` table and a Supabase Edge Function to keep it in sync with LemonSqueezy subscription events.

**Implementation:**
- `orgs.plan` is `TEXT NOT NULL DEFAULT 'free'`, values: `'free' | 'premium'`
- Edge Function `lemonsqueezy-webhook` uses HMAC-SHA256 signature verification (`X-Signature` header) before processing
- Org identified via `event.data.attributes.custom_data.org_id` — callers must pass this when creating checkout sessions
- Function registered in `supabase/config.toml` with `verify_jwt = false` (LemonSqueezy is not an authenticated caller)
- Service role client used for DB writes (bypasses RLS)

**Rationale:** Single `plan` column on `orgs` avoids joining `subscriptions` table on every request. Simplest path to org-level billing state. Existing `subscriptions` table (per-user) can coexist; `orgs.plan` is the authoritative gate for org-level feature access.

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

## Session Rules

### No Git Commits Except for Deployment (2026-05-07)
**Authority:** SteveQiu (via Copilot)

Squad agents and Scribe must never `git commit` unless the commit is deployment-ready code. Session logs, history updates, and decision merges are written to disk only — not committed.

## Incident & Reversions

### Dallas Cash Payment Button Revert (2026-05-07)
**What:** Dallas implemented payment_method_type tracking (migration + types.ts + Appointments.tsx) in commit b1609e5.

**Build Status:** Passed tsc and npm run build cleanly

**Runtime:** Caused silent blank-page crash at runtime

**Reversion:** Reverted in commit 1b803ad

**Root Cause:** Unknown — Appointments.tsx is a known-fragile large file with history of silent runtime failures despite tsc passing

**Lesson:** Build gate (tsc) is necessary but NOT sufficient. Runtime testing required before commit. If re-attempted, use smallest possible changes with runtime verification.

## Team & Process

### Rubber Duck Cross-Checkers (2026-05-12)
**Authority:** SteveQiu (via Copilot)

Always hire rubber duck cross-checkers for review work. Use Gemini and GPT models — not Claude — so the perspective is genuinely independent from the primary agents.

**Why:** User request — different model families catch different classes of errors. Diversity of model perspective strengthens review quality.

## Legal & Compliance

### Jurisdiction: Delaware (Pending Fact-Check) (2026-05-12)
**Authority:** Burke (Legal Counsel)

**Claim:** Delaware selected as governing law jurisdiction for Terms of Service (Section 12).

**Rationale:** LemonSqueezy (merchant of record) is incorporated in Delaware; Delaware is standard US SaaS jurisdiction for predictability and investor preference.

**Status:** ⚠️ **REJECTED by Hicks (fact-check)**. LemonSqueezy is a **Utah LLC** (confirmed: Section 12.2 of LemonSqueezy Terms states "State of Utah"), not Delaware. Burke's factual basis is incorrect.

**Action Required:** Steve must confirm PikAppoint's actual state of incorporation and use that, OR choose jurisdiction with independent legal basis (not LemonSqueezy's incorporation).

**Blocking:** Yes — must fix Section 12 before production.

### Demo Video Production Guide (2026-05-12)
**Authority:** Demo Video Producer (Squad)

Complete end-to-end guide for recording, editing, and uploading LemonSqueezy product demo. Covers:
- Video specs (1920×1080 MP4, H.264, 60–120 seconds, <200 MB)
- Toolchain (OBS Studio, DaVinci Resolve, Adobe Podcast Enhance)
- Complete demo script (~90 seconds, 5 feature sections)
- Recording checklist and LemonSqueezy upload instructions

Purpose: Enable solo founder (zero prior video experience) to produce professional product demo.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction

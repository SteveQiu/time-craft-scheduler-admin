# Dallas — History

## Project Onboarding

**Project:** time-craft-scheduler-admin  
**Stack:** React 18, TypeScript, Tailwind CSS, Shadcn/ui  
**Focus Areas:** Profile page, browse page, sidebar, mobile responsiveness

### Key Files & Locations

- **Profile page:** `src/pages/Profile.tsx` — address visibility toggles, privacy controls, read/edit modes
- **Browse page:** `src/pages/Browse.tsx` — bookmark layout, redundant box cleanup
- **Sidebar:** `src/components/` — navigation
- **Styles:** Tailwind utilities across components; responsive breakpoints needed for mobile

### Recent Work (from context)

- Fixed address visibility toggle persistence (save mutation → database state)
- Fixed read-mode rendering to check database privacy values
- Identified mobile UI pain points: sidebar, browse layout, profile layout on phones

### Learnings
- View Proof button restyled: replaced plain `<button>` with Shadcn `<Button variant="outline" size="sm">` + green border/text (`border-green-500 text-green-600 hover:bg-green-50`) + `FileImage` lucide icon. Compact sizing `h-6 px-2 text-xs` keeps it inline next to Paid badge. Two instances updated: `renderGroupedPendingCard` (~line 783) and `renderAppointmentCard` (~line 903). Added `FileImage` to lucide import line.
- Bulk proof query: change from .select('appointment_id') to .select('appointment_id, photo') to fetch photo alongside ID
- paidAppointmentIds changed from Set<string> to Map<string, string | null> — key=appointment_id, value=photo (base64 data URL) or null
- Map.has() still works for badge gating; Map.get() retrieves photo for proof link
- Provider proof modal (commit 5b797c7): providerViewProofAppointmentId state + providerViewProof query with select('*') already existed; document.write buttons wired to call setProviderViewProofAppointmentId(id). Modal shows note + photo + timestamp. Button shows for all proof records (has(id)), not just when photo exists.


- Privacy state has two systems: `privacySettings` (database-backed) and `addressVisibility` (deprecated localStorage)
- Single source of truth: always check `privacySettings` for visibility logic
- Address display: show fully if public=true, hide entirely if false (not partial)
- Mobile is a pending concern — pages likely have fixed widths or poor breakpoint coverage
- Settings.tsx Payment tab renamed to "Payment Acceptance" (UI labels only — DB columns unchanged)
- Payment types narrowed to: cash, paypal, venmo, email_transfer, wechat
- Venmo supports three sub-modes: username, phone, qr (base64 image); detected on edit via `data:image` prefix or phone regex
- QR images stored as base64 in `details` field; displayed as `<img>` in card view for wechat and venmo-qr
- Use toggle `<Button variant="outline/default">` trio for sub-selectors when RadioGroup isn't easily available
- `payment_proofs` table: `id`, `appointment_id`, `customer_id`, `note` (text), `photo` (base64 JPEG), `created_at`, `updated_at`
- Provider proof view: on-demand fetch (single query keyed by `providerViewProofAppointmentId`) — no bulk prefetch needed since provider clicks to view
- Provider button condition: `canManage && appointment.user_id !== user?.id` — avoids showing both customer and provider buttons to same user
- IIFE pattern (`{(() => { ... })()}`) used to compute `providerViewAppt` inline in JSX without polluting component scope
- Bulk payment proof fetch: single `useQuery` keyed by `['payment-proofs-bulk', appointmentIds]`, selects only `appointment_id`, enabled when list is non-empty; result memoized into a `Set<string>` for O(1) per-card lookup
- "Paid" badge: `<Badge variant="outline" className="text-green-600 border-green-600 dark:text-green-400 dark:border-green-400 text-xs">` placed inside existing `flex items-center space-x-3` div, right after status badge
- `modify_appointment` RPC auth check: `_old_apt.user_id != _caller_id AND _old_apt.provider_id != _caller_id` — allows EITHER customer OR provider to reschedule
- "Cannot book own opening" check uses `_old_apt.user_id` (the customer), NOT `_caller_id` — so provider can reschedule onto their own available slots
- INSERT always uses `_old_apt.user_id` for the customer field — booking always stays under original customer regardless of who initiated the reschedule
- Payment proof transfer: `UPDATE payment_proofs SET appointment_id = _new_appointment_id WHERE appointment_id = _appointment_id` at end of `modify_appointment` — proof moves with reschedule, no frontend change needed
- Bulk payment query (`['payment-proofs-bulk', appointmentIds]`) automatically includes new appointment IDs after reschedule — Paid badge appears without extra code
- Cash payment warning: `Alert` component only has `default` and `destructive` variants — no warning/yellow variant; use raw Tailwind `bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-3 text-sm` div instead
- Cash "toggle" in Settings.tsx is the type Select in the payment dialog; `paymentForm.type === 'cash'` drives conditional renders in that dialog
- PayPal stores BOTH username and QR as JSON in `details`: `{"username":"...","qr":"data:image/..."}` — unlike Venmo which stores only one value; parse with try/catch for legacy plain-URL fallback
- PayPal customer display: parse JSON → show `https://paypal.me/{username}` button (bg `#0070BA`) if username set, QR image if qr set, fallback text if neither
- Two separate state vars `paypalUsername`/`paypalQr` feed `getPaypalDetails()` which serializes to JSON on save; reset both on type-change and dialog close
- IIFE `{(() => { ... })()}` pattern used in PayPal customer display JSX to handle multi-branch logic cleanly

### Payment Module Refactor (May 2026)

- Payment module lives at `src/lib/payment/` — single source of truth for types, registry, and serialization
- Registry in `src/lib/payment/methods.ts` (`PAYMENT_METHOD_CONFIGS`) — add new payment type in ONE place
- `deserializeDetailsByType(type, raw)` in serialization.ts handles ALL legacy plain-string formats per type: venmo detects base64/phone/username, wechat assumes base64, email_transfer assumes email
- `compressImageFile(file)` — extracted utility in serialization.ts; returns `null` if >1MB (caller shows toast)
- `usePaymentMethod()` hook — manages `PaymentDetails` state, exposes `setField`, `clearField`, `setImageField`, `reset`, `serialize`; `setImageField` calls `compressImageFile` and shows toast on size error
- `PaymentMethodForm` — controlled component (`value`/`onChange`), renders fields dynamically from `PaymentMethodConfig.fields`; handles `text` and `image` field types; cash renders warning div
- `PaymentMethodCard` — settings list item using `getSummary()` helper; shows QR preview for image-type methods, text for others
- `PaymentDisplay` — customer-facing display; handles all 5 types + unknown fallback + all legacy formats
- Settings.tsx: replaced `venmoInputType`, `paypalUsername`, `paypalQr`, `paymentForm.details`, `handleQRUpload`, `handlePaypalQRUpload`, `getPaypalDetails` with `usePaymentMethod` hook + `PaymentMethodForm` + `PaymentMethodCard`
- Appointments.tsx: replaced 60-line PayPal IIFE + per-type if/else with `<PaymentDisplay type={pm.type} details={deserializeDetailsByType(...)} />`
- Venmo phone sub-mode (3-mode selector) removed from form — new form has username + QR fields; legacy phone entries still display via `deserializeDetailsByType` mapping `{phone: raw}` for display
- `PaymentMethodRecord` = DB shape (`details: string | null`); used in Appointments + Settings queries; display components take deserialized `PaymentDetails`

## Learnings
- Bulk proof query: change from .select('appointment_id') to .select('appointment_id, photo') to fetch photo alongside ID
- paidAppointmentIds changed from Set<string> to Map<string, string | null> — key=appointment_id, value=photo (base64 data URL) or null
- Map.has() still works for badge gating; Map.get() retrieves photo for proof link
- Provider proof modal (commit 5b797c7): providerViewProofAppointmentId state + providerViewProof query with select('*') already existed; document.write buttons wired to call setProviderViewProofAppointmentId(id). Modal shows note + photo + timestamp. Button shows for all proof records (has(id)), not just when photo exists.


- `handleBulkComplete` bug: single `.update().in('id', ids)` only completed the first row — Supabase RLS evaluates per-row and the batch call fails silently for subsequent rows. Fix: sequential `for...of` loop with individual `.eq('id', apt.id)` updates, matching `handleBulkApprove`/`handleBulkCancel` pattern.
- Bulk action pattern: always use `for...of` loop + individual RPC/update calls, NOT batch `.in()` — consistent, RLS-safe, and partial-failure tolerant.
- Notification system (`src/pages/Notifications.tsx`): powered by `get_my_notifications` RPC; returns `id`, `event_type`, `entity_type`, `entity_id`, `actor_id`, `metadata`, `created_at`, `is_unread`. Bell count driven by `get_unread_notification_count` RPC in AppSidebar. No realtime subscription — manual mark-read on mount.
- `appointment.created` event = new booking request to provider; `entity_id` = appointment ID. To show Paid badge: bulk-fetch `payment_proofs` for those appointment IDs (same pattern as Appointments.tsx), memoize into Set, render green Badge inline next to label. No notification system restructuring needed.

### Per-Opening Payment Method Selection (May 2026)

- `openings` table gained `accepted_payment_method_ids text[] DEFAULT NULL` — NULL means show all provider methods (backward compat)
- Calendar.tsx: `Opening` interface has `accepted_payment_method_ids?: string[] | null`
- Provider payment methods fetched via `useQuery(['provider-payment-methods-for-opening', user?.id])` — `id, label, type` only
- `newOpening` state has `acceptedPaymentMethodIds: string[]`; `resetForm()` resets it to `[]`
- All 3 insert paths pass `accepted_payment_method_ids: arr.length > 0 ? arr : null`
- Edit dialog: `editingOpening` + `editForm` state; `openEditDialog(opening)` pre-fills form; `saveEditOpening()` does UPDATE + local state patch; only available when `opening.is_available === true` (not booked)
- Appointments.tsx: `paymentInfoOpeningId` tracks which opening the customer is paying for; cleared on dialog close
- `paymentInfoOpening` query fetches only `accepted_payment_method_ids` from that opening
- `allAvailableMethods` memo: deduplicates (provider + org), then filters by `accepted_payment_method_ids` if set; falls back to all if NULL/empty
- Payment dialog now maps over `allAvailableMethods` flat list instead of separate org/provider sections

### Date Range Filter for Org Active Appointments (2026)

- **Date field used:** `apt.date` (format: "YYYY-MM-DD") — parsed via `new Date(y, m - 1, d)` to avoid UTC-midnight timezone skew
- **Filter scope:** org mode only; applies to `nonPendingActive` (confirmed/upcoming), NOT the grouped pending section
- **Filter state:** `dateFilter: DateFilter` (`'all' | 'today' | 'week' | 'month'`), default `'all'`
- **Helper:** module-level `applyDateFilter(apts, filter)` → returns subset; `filteredNonPendingActive` derived from `nonPendingActive` in org mode
- **UI placement:** row of Shadcn `<Button size="sm">` toggle buttons inserted between grouped-pending section and confirmed appointments; guarded by `isOrgView`
- **Active button:** `variant="default"`; inactive: `variant="outline"`
- **Empty state:** `dateFilter !== 'all'` → renders `<p className="text-muted-foreground text-sm">No appointments for this period.</p>` instead of the full empty Card

### Weekly Sunday Dividers in Org Appointments (2026)

- **Location:** `src/components/Appointments.tsx` — the `filteredNonPendingActive.map(...)` render block (~line 1233)
- **Helper functions** (module-level, before `applyDateFilter`):
  - `getWeekStartSunday(dateStr)` — returns YYYY-MM-DD of the Sunday that starts the appointment's week
  - `formatWeekLabel(weekStart)` — formats as "May 4" using `toLocaleDateString('en-US', {month:'short', day:'numeric'})`
- **Condition:** dividers only shown when `isOrgView && (dateFilter === 'all' || dateFilter === 'month')` — skipped for `'today'`/`'week'` (single-week view)
- **Pattern:** IIFE inside JSX (`{(() => { ... })()}`) with `let lastWeekStart = ''` — plain `let`, NOT useState. Tracks last week as it iterates. Each appointment wrapped in `<React.Fragment key={apt.id}>` to include optional divider.
- **Divider markup:** `flex items-center gap-3 my-3` row with `h-px bg-border` lines and `text-xs text-muted-foreground font-medium whitespace-nowrap` label
- **Commit:** `7dceb05`

### ⚠️ Import Safety Rule (learned May 2026)

When refactoring imports (removing, renaming, or replacing), **always grep for ALL usages of the removed symbol** across the entire file before deleting it. Removing `Edit, Trash2` from lucide-react during a payment refactor broke Settings.tsx (blank page) because those icons were still used in the settings table actions — the refactor only scanned the payment section. Rule: `grep -n 'SymbolName'` in the file before any removal.

### RULE: Always verify page after edits
After EVERY edit to Appointments.tsx (or any page component), run:
  npx tsc --noEmit
If errors → fix before committing. NEVER commit a broken build.
Pattern: This page has gone blank 2+ times due to bad imports after styling edits.
Risk files: Appointments.tsx (large, many imports, easy to break)

### RULE: Never call useState inside an IIFE in JSX (learned May 2026)
`useState` (or any hook) inside `{(() => { const [x] = useState(); return ... })()}` violates React's Rules of Hooks and causes a runtime crash → blank page. TSC does NOT catch this.
Fix: move the `useState` call to the top-level of the component. The IIFE can stay for local variable scoping (e.g. `providerViewAppt`), but hooks must be at top level.

### RLS-Safe Rate Lookup via SECURITY DEFINER RPC (2026-05-07)

- Customers can't read `openings` or `profiles` directly — RLS blocks all rows → all rates returned 0 → "Free" shown for all appointments
- Fix: `get_appointment_rates` RPC (`SECURITY DEFINER`) bypasses RLS server-side; `WHERE` clause still enforces ownership (`user_id = auth.uid() OR provider_id = auth.uid()`)
- `appointmentRateMap` keyed by **appointment ID** replaces `openingRateMap` (keyed by opening_id) + `providerRateMap` (keyed by provider_id)
- Single RPC query replaces two separate `openings` + `profiles` queries
- Works without applying the `20260507_add_hourly_rate_to_appointments` migration (no dependency on `apt.hourly_rate` column)
- Migration file: `supabase/migrations/20260507001_get_appointment_rates_rpc.sql`

### Patterns & Preferences

- Use Tailwind responsive utilities (`sm:`, `md:`, `lg:`) for breakpoint-driven layout
- Test on 375px (iPhone), 768px (tablet), 1024px+ (desktop)
- Component structure first, then add responsive classes
- Validate on real devices or DevTools mobile mode

## Mobile Assessment (Pre-Bishop Audit)

**Date:** January 2025  
**Objective:** Assess current responsive design coverage, identify gaps, prepare for mobile fixes post-audit

### Current Responsive Coverage

#### Profile.tsx
- **Limited breakpoints**: Only 3 instances of responsive utilities (all `md:`)
  - `grid-cols-1 md:grid-cols-2` on address form (line 665, 674)
  - No `sm:` utilities anywhere (375px breakpoint missing)
  - No `lg:` or `xl:` utilities
- **Container width**: Fixed `max-w-3xl` on main container — not responsive
- **Padding**: Fixed `p-6` throughout — no mobile adjustments
- **Header layout**: `.flex items-center space-x-4` (line 337) — avatar + text stacks poorly on small screens
- **Button groups**: Multiple buttons in header (Share/Browse/Bookmark/Flag/Edit) — no wrapping on mobile (line 366-408)

#### BookingBrowse.tsx
- **Grid layout**: Uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (line 387, 456) — **good coverage**
- **Card content**: No responsive adjustments for avatar size, text wrapping
- **Bookmark icon**: Small (h-4 w-4) — may be hard to tap (line 354)
- **No sm: breakpoints** — jumps directly from mobile-first to `md:`

#### AppSidebar.tsx
- **Zero responsive utilities** — fixed layout for all screen sizes
- **No mobile collapse** — sidebar always visible (no hamburger menu)
- **Fixed padding**: `px-4 py-3`, `px-3 py-2` (lines 61-176)
- **Tab switcher**: Fixed `grid-cols-2 h-8` (line 184) — no touch optimization

### Gaps Identified

1. **Missing sm: breakpoints (375px)**
   - No mobile-specific adjustments anywhere
   - Text sizes, padding, spacing all desktop-optimized

2. **Touch target violations (< 44x44px)**
   - Button size="sm": `h-9` (36px) — **below minimum** (line 24 in button.tsx)
   - Icon buttons: `h-10 w-10` (40px) — **marginal** (line 26)
   - Privacy toggle buttons (Eye/EyeOff): likely too small in mobile context
   - Bookmark icon: `h-4 w-4` (16px) — **far too small**

3. **Fixed widths & inflexible layouts**
   - Profile container: `max-w-3xl` — should use `max-w-full sm:max-w-3xl`
   - Profile header button group: no flex-wrap — overflows on narrow screens
   - Sidebar: no mobile collapse — consumes valuable screen real estate

4. **Spacing issues**
   - Profile padding: `p-6` (24px) — too generous on mobile, should be `p-4 md:p-6`
   - Form field gaps: `gap-4` — could be tighter on mobile (`gap-3 md:gap-4`)
   - Sidebar padding: fixed across all screens

5. **Layout constraints**
   - Profile header: avatar + name + buttons all in one row — breaks on narrow screens
   - Address form: 2-column grid starts at `md:` — should consider single column on `sm:`
   - Browse cards: missing intermediate breakpoint adjustments

### Tailwind Config Review

- **Default breakpoints**: Tailwind defaults (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- **Custom screens**: Only `2xl: 1400px` defined in container
- **Requested breakpoints**: sm:375px is NOT configured — using default 640px
  - **Action needed**: Add custom `sm: 375px` to theme.screens if 375px target required

### Touch Target Audit

| Component | Current Size | Required | Status |
|-----------|-------------|----------|---------|
| Button (default) | 40px | 44px | ⚠️ Close |
| Button (sm) | 36px | 44px | ❌ Too small |
| Icon button | 40px × 40px | 44px × 44px | ⚠️ Close |
| Input (default) | 40px | 44px | ⚠️ Close |
| Privacy toggles | ~36px | 44px | ❌ Too small |
| Bookmark icon | 16px | 44px | ❌ Far too small |

**Recommendation**: Add mobile-specific sizing: `size="sm" md:size="sm"` → `size="default"` on mobile

### Implementation Plan Outline

**Phase 1: Critical Touch Targets** (post-audit priority)
1. Increase button sizes on mobile — replace `size="sm"` with conditional sizing
2. Make bookmark icon a proper button with 44px min touch area
3. Add padding to icon-only buttons

**Phase 2: Layout Responsiveness**
1. Profile header: stack avatar/info/buttons on mobile (`flex-col sm:flex-row`)
2. Profile container: add `sm:` padding adjustments (`p-4 sm:p-6`)
3. Button groups: add `flex-wrap` to prevent overflow

**Phase 3: Sidebar Mobile**
1. Add mobile hamburger menu (integrate ShadcnUI Sheet component)
2. Collapse sidebar on `< md:` breakpoints
3. Add touch-friendly spacing to nav items

**Phase 4: Browse & Cards**
1. Adjust card padding on mobile
2. Optimize avatar sizes for smaller screens
3. Add bookmark button with proper touch target

**Phase 5: Global Breakpoint Review**
1. Evaluate if `sm: 375px` custom breakpoint needed (vs default 640px)
2. Audit all `md:` usage — add `sm:` where appropriate
3. Test on iPhone SE (375px), iPhone 14 (390px), iPad (768px)

### Coordination with Bishop

**Accessibility overlaps to watch for:**
- Touch target sizing (WCAG 2.5.5) — Bishop's audit should flag same issues
- Focus indicators on mobile (keyboard navigation → touch navigation)
- Color contrast on small text (mobile readability)
- Form label associations (mobile layout changes may affect proximity)

**Handoff plan:**
- Wait for Bishop's audit results
- Prioritize fixes by severity (critical touch targets first)
- Implement responsive changes without breaking existing accessibility
- Re-test after implementation with Bishop's checklist

### Files to Modify (Ready to Deploy)

1. `src/pages/Profile.tsx` — header layout, container padding, button sizing, form grid
2. `src/components/BookingBrowse.tsx` — bookmark button, card layout, spacing
3. `src/components/AppSidebar.tsx` — mobile collapse, touch spacing, nav responsiveness
4. `src/components/ui/button.tsx` — consider mobile size variant (size="mobile"?)
5. `tailwind.config.ts` — evaluate custom `sm: 375px` breakpoint

**Estimated effort:** 3-4 hours implementation + 1 hour testing

## Learnings
- Bulk proof query: change from .select('appointment_id') to .select('appointment_id, photo') to fetch photo alongside ID
- paidAppointmentIds changed from Set<string> to Map<string, string | null> — key=appointment_id, value=photo (base64 data URL) or null
- Map.has() still works for badge gating; Map.get() retrieves photo for proof link
- Provider proof modal (commit 5b797c7): providerViewProofAppointmentId state + providerViewProof query with select('*') already existed; document.write buttons wired to call setProviderViewProofAppointmentId(id). Modal shows note + photo + timestamp. Button shows for all proof records (has(id)), not just when photo exists.


### Address Architecture (January 2025)

**Task:** Complete address architecture implementation after partial agent run

**What changed:**
- Created `src/lib/address.ts` — pure utils: `LocationFields` interface, `parseLocation()`, `formatLocation()`, `serializeLocation()`
- Created `src/hooks/useAddress.ts` — stateful hook managing address form state with `fields`, `setField`, `setFields`, `serialized`, `formatted`, `isEmpty`, `reset`
- Created `src/components/ui/AddressInput.tsx` — reusable component with 4 inputs (city, province, country, zip), supports `2x2` or `stacked` layout
- Refactored `Calendar.tsx` to use `<AddressInput>` component instead of manual grid of 4 inputs
- Fixed missing imports in `ModifyAppointmentDialog.tsx` and `BrowseDetail.tsx`
- Added Location tab in `Settings.tsx` with province/country preference saved to `localStorage`
- Location filter in `BookingBrowse.tsx` reads preference and filters openings by matching province + country

**Pattern:**
- Display: `formatLocation(parseLocation(raw))` — always use for read-only location rendering
- Edit forms: `useAddress({ initialValue, onChange })` + `<AddressInput value={address.fields} onChange={address.setFields} />`
- Hook owns state; component is controlled input; utils are pure functions
- Workplace addresses in Settings use separate schema (includes `street` field) — different from opening location (city/province/country/zip only)

**Why this approach:**
- Separation of concerns: pure utils + stateful hook + dumb component
- Reusability: any form needing address input uses same components
- Consistency: all location display uses same formatLocation logic
- Type safety: LocationFields interface enforced across stack

### Appointments Bulk Actions (January 2025)

**Task:** Convert `Appointments.tsx` per-card action buttons → multi-select + bulk action toolbar

**What changed:**
- Added `selectedIds: Set<string>` and `isBulkActing: boolean` state
- Imported `Checkbox` from `@/components/ui/checkbox`
- Each appointment card (active + inactive) now has a leading checkbox; clicking it toggles selection without navigating
- Per-card Complete/Approve/Reject/Cancel buttons and `ModifyAppointmentDialog` removed from `renderAppointmentCard`
- "Select All / Deselect All" toggle added beside "Active Appointments" heading (scoped to `nonPendingActive`)
- Sticky bulk toolbar renders above the list when `selectedIds.size > 0`; shows contextual Approve/Complete/Cancel counts
- Bulk handlers: `handleBulkApprove`, `handleBulkCancel`, `handleBulkComplete` — loop/batch Supabase RPCs, toast on finish, invalidate queries
- Filter changes (search, status, worker) clear selection via `setSelectedIds(new Set())`
- `renderGroupedPendingCard` left completely untouched (org pending approval flow)

**Key decisions:**
- Inactive cards also get checkboxes (per spec) so bulk-cancel/complete works on past items
- Select All is scoped to active (`nonPendingActive`) only — no select-all for inactive (per spec)
- Toolbar is sticky (`top-4 z-10`) so it stays visible while scrolling a long list

### High-Priority Mobile Fixes Implementation (January 2025)

**Completed fixes from Bishop's audit — top 3 priorities:**

### Address Dropdowns (January 2025)

**Task:** Replace freetext Country/Province inputs with Select dropdowns

**What changed:**
- `src/lib/address.ts` — added `COUNTRIES` array (Canada, United States), `PROVINCES_BY_COUNTRY` record (13 CA + 51 US), `Country` type
- `src/components/ui/AddressInput.tsx` — replaced Country and Province `<Input>` with Shadcn `<Select>` components
  - Country select: dropdown from `COUNTRIES`
  - Province select: reactive to country — options from `PROVINCES_BY_COUNTRY[country]`, disabled if no country selected, resets province if not in new country's list
  - City and ZIP remain freetext inputs
  - Both `2x2` and `stacked` layouts work correctly
- `src/pages/Settings.tsx` — Location Preference tab now uses Select dropdowns (imported `COUNTRIES`, `PROVINCES_BY_COUNTRY`)
  - Country select first, then Province select (disabled until country chosen)
  - Province resets when country changes and old province not in new list
- `src/components/BookingBrowse.tsx` — no changes needed (uses locationFilter from localStorage, no manual inputs)

**Pattern:**
- Country select triggers reactive handler: clears province if not in new country's list
- Province select disabled state: `disabled={!country || availableProvinces.length === 0}`
- Placeholder text adapts: "Select country first" when disabled, "Select province/state" when enabled

**Why dropdowns:**
- Prevents typos/format inconsistencies (BC vs British Columbia vs bc)
- Standardizes province/state names across database
- Improves filtering reliability — exact string matches now guaranteed
- Better UX — no memorizing abbreviations or correct spelling

**Build verification:**
- `npx tsc --noEmit` ✅ passed (exit code 0)
- `npm run build` ✅ passed (46.09s, no errors)



#### 1. Mobile Sidebar Navigation (Issues #9, #13, #14)
**Files modified:** `src/App.tsx`
- Added hamburger menu w/ Sheet component for mobile (md breakpoint)
- Desktop: PanelGroup w/ resizable sidebar (hidden on mobile)
- Mobile: Sheet drawer triggered by Menu icon in header
- Header: `<header className="md:hidden">` w/ logo, hamburger, sticky positioning
- State: `useState` for sheet open/close
- Routes duplicated for mobile/desktop contexts (both hidden appropriately)

**Touch target decisions:**
- Hamburger button: default `size="icon"` (40px) → OK for primary nav trigger
- Added `aria-label="Open navigation menu"` for screen readers

**Implementation notes:**
- Imported `Menu` from lucide-react, `Sheet`/`SheetContent` from shadcn
- Sheet width: 280px (comfortable sidebar width on mobile)
- Avoided state persistence — sheet closes after navigation (expected UX)

#### 2. Icon-Only Button aria-labels (Issue #17)
**Files modified:** `src/pages/Profile.tsx`
- Email toggle: `aria-label="Hide email from public profile"` / `"Show email on public profile"`
- Phone toggle: `aria-label="Hide phone from public profile"` / `"Show phone on public profile"`
- Address toggle: `aria-label="Hide address from public profile"` / `"Show address on public profile"`
- Bookmark: `aria-label="Bookmark this profile"` / `"Remove bookmark from this profile"`
- Flag: `aria-label="Report this profile"`
- Skill delete buttons: `aria-label="Remove skill: ${skill}"` (dynamic)

**Pattern:** All icon-only buttons now have contextual aria-labels describing action + target

#### 3. Touch Target Sizing (Issues #2, #4, #12)
**Files modified:** `src/pages/Profile.tsx`, `src/components/AppSidebar.tsx`
- Email/Phone privacy toggles: `h-11 w-11` (44px) — changed from `size="sm"` to `size="icon" className="h-11 w-11"`
- Address privacy toggle: `h-11 w-11` (44px) — same pattern
- Skill delete buttons: `min-h-11 min-w-11` — ensures 44px minimum on touch
- Sidebar tab switcher: `h-11` (changed from `h-8` = 32px → 44px)

**Touch target sizing decisions:**
- All icon buttons: 44x44px minimum (WCAG 2.5.5 AAA compliance)
- Bookmark/Flag buttons: kept `size="sm"` (text labels present, not icon-only)
- Desktop layout: unchanged (responsive classes not needed — 44px works everywhere)

**Issues encountered:**
- None — build succeeded, no TypeScript errors
- All changes backward-compatible (added classes, not replaced)

### Validation Results
- ✅ Build: `npm run build` — 7.98s, no errors
- ✅ TypeScript: `npx tsc --noEmit` — no errors
- ✅ Mobile header: visible at 375px (verified via code review)
- ✅ Sidebar: responsive (Sheet on mobile, PanelGroup on desktop)
- ✅ Touch targets: all icon buttons 44x44px
- ✅ Aria-labels: all icon-only buttons labeled

### Next Steps
- Test on physical device (iPhone SE, iPad)
- Verify Sheet animation + close behavior
- Check sidebar navigation flow on touch devices
- Coordinate with Bishop on remaining 28 audit issues

### Calendar.tsx - Bulk Delete (openings day view)
- Added multi-select via Shadcn Checkbox per opening row
- selectedOpeningIds: Set<string> - cleared on date change
- Delete Selected (N) button in day panel header; destructive, disabled when 0 selected
- handleBulkDelete queries appointments for pending/confirmed before delete
- Blocked openings shown in Dialog with Go Back / Delete Safe Ones (N) actions
- deleteSafeOpenings does .delete().in('id', ids) + local state update + toast
- DialogDescription + DialogFooter added to dialog imports
- Trash2 added to lucide-react imports
- All new state at top of component, near collapsedWorkers

### Appointment Confirmation Notifications (January 2025)

**Task:** Polling-based browser notifications when user's appointments get confirmed

**Implementation:**
- Created `src/config/notificationConfig.ts` — single config object for all tuneable values
  - `pollIntervalMs: 60_000` (60 seconds)
  - `maxAppointmentsToCheck: 50`
  - `lookbackDays: 30`
  - `enabled: true` (feature flag)
  - `notification.title`, `.body()`, `.icon`, `.autoCloseMs: 8_000`
- Created `src/hooks/useAppointmentNotifications.ts` — polling hook
  - Requests `Notification.permission` on mount if default
  - Polls Supabase for confirmed appointments via `setInterval`
  - Tracks seen IDs in `useRef<Set<string>>`
  - Initial load: populates set WITHOUT firing (avoids spam on page load)
  - Subsequent polls: fires notification for NEW confirmed appointments
  - Query: `status='confirmed' && user_id=userId && date >= lookbackCutoff`
  - Returns: `{ permissionStatus, requestPermission, isPolling, lastChecked }`
- Updated `src/components/Appointments.tsx`:
  - Imported hook + Bell icons (BellRing, BellOff, Bell) + Tooltip
  - Mounted hook after `useUserRoles()` with `userId: user?.id, enabled: !isOrgView`
  - Added notification indicator in page header (top-right, next to title)
  - UI states:
    - `granted`: green BellRing icon, tooltip "Notifications enabled"
    - `denied`: gray BellOff icon, tooltip "Notifications blocked..."
    - `default`: Bell icon + "Enable notifications" button
  - Only shows for user view (hidden in org mode)

**Key decisions:**
- No Supabase Realtime — pure REST polling to avoid extra cost
- Config file is flat + easy to edit (single source of tuneable values)
- Hook handles ALL logic — no inline logic in component
- Initial load populates seen set to prevent notification spam
- Only shows for regular users, not org admins
- Auto-closes after 8 seconds (configurable)

**Type checking:** ✅ `npx tsc --noEmit` — no errors

### Appointment Action Button Role Assignment (January 2025)

**Task:** Fix backwards button roles in pending appointments section

**Bug:**
- Provider was seeing "Reject" button that called `handleCancel`
- Customer was seeing no buttons (`: null`)

**Root cause (line 736-747 in `Appointments.tsx`):**
```typescript
{aptIsProvider ? (
  <>
    <Button onClick={() => handleApprove(apt.id)}>Approve</Button>
    <Button onClick={() => handleCancel(apt.id)}>Reject</Button>
  </>
) : null}
```

**Fix:**
- Provider: kept Approve + Reject buttons (both use `handleCancel` — RPC determines action by caller_id)
- Customer: added `else` clause with Cancel button
- New logic:
  ```typescript
  {aptIsProvider ? (
    /* Approve + Reject buttons */
  ) : (
    <Button onClick={() => handleCancel(apt.id)}>Cancel</Button>
  )}
  ```

**Key insight:**
- `cancel_appointment` RPC handles both provider rejection and customer cancellation
- Role determined by `_caller_id` parameter (which user calls it)
- UI just needs to show correct button label + placement for each role
- `aptIsProvider` checks `apt.provider_id === user?.id` (line 719)

**Build:** ✅ `npm run build` — no errors


## 2026-05-06: App name config pattern
Created src/config/app.ts as single source of truth for APP_NAME and contact emails (supportEmail, privacyEmail, legalEmail). Updated AppSidebar, App, ResetPasswordFlow, SignInDialog, Auth, and Privacy/ConsentModal to import from config. Changing the app name now requires editing only one file.

### Centralize Date/Time Formats (May 2026)

**Task:** Extract all repeated 	oLocaleDateString/	oLocaleTimeString inline options into src/config/formats.ts.

**Created:** src/config/formats.ts
- LOCALE = 'en-US'
- DATE_FORMATS.long — { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
- DATE_FORMATS.weekdayShort — { weekday: 'long', month: 'short', day: 'numeric' }
- TIME_FORMATS.time24 — { hour: '2-digit', minute: '2-digit', hour12: false }

**Updated files:**
- src/pages/AppointmentView.tsx — DATE_FORMATS.long replaces inline object (line 206)
- src/pages/OpeningView.tsx — DATE_FORMATS.long replaces inline object (line 138)
- src/components/Calendar.tsx — DATE_FORMATS.weekdayShort (line 920); TIME_FORMATS.time24 (lines 1015, 1433, 1435)
- src/components/BrowseDetail.tsx — TIME_FORMATS.time24 (line 284)

**Left inline (intentionally):**
- All 	oLocaleDateString() no-arg calls — no options object to extract
- 	oLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) in AppointmentView.tsx:96 — uses [] locale (browser default), one-off chat timestamp
- 	oLocaleDateString() in ConsentModal.tsx, Settings.tsx, BrowseDetail.tsx (320, 363) — no locale/options args, locale-default behavior intentional

---

## 2026-05-06: Centralized Route Paths

**Task:** Centralize all hardcoded route path strings into src/config/routes.ts
**Files Changed:**
- Created src/config/routes.ts — ROUTES const with 14 path entries + AppRoute type
- src/App.tsx — added ROUTES import; replaced all hardcoded paths in both desktop and mobile Route blocks
- src/components/AppSidebar.tsx — added ROUTES import; replaced paths in userNavItems, orgNavItems, isActive comparisons, all footer Links, and navigate() call
- src/pages/AppointmentView.tsx — added ROUTES import; replaced 2x navigate('/appointments')

---

## 2026-05-07: Appointments Layout & Sorting

**Delivered 3 commits:**

1. **f4d67fe** — Week dividers + inactive date filter
   - Week dividers now group headers (full-width rule + "Week of X" label)
   - Date filter applies to both active & inactive appointments
   - Completes decision: week-dividers-as-headers pattern

2. **e896927** — Remove max-width, move filters to top
   - Removed `max-w-7xl` from App.tsx (container now full-width)
   - Moved date filters to top Filters Card (compact placement)
   - Improves layout for wider displays

3. **19e2f70** — Sort appointments by date
   - Active appointments: ascending (upcoming first)
   - Inactive appointments: descending (recent first)

**Bishop Review:** Applied 5 a11y fixes (aria-label, aria-pressed, aria-expanded, aria-hidden on icons). All shipped.

**Status:** ✅ Complete. Awaiting Squad guidance on per-page max-width pattern.
- src/pages/RootRedirect.tsx — added ROUTES import; replaced 3x Navigate to= props

**Left hardcoded (intentional):**
- /auth/callback — not present in these files; Supabase OAuth redirect left untouched per policy
- Dynamic param suffixes (:id, :slug, :providerId) — stored as full patterns in ROUTES (e.g. ROUTES.appointmentDetail = '/appointments/:id')
- Query string variants (?mode=org) — composed at point of use via template literal against ROUTES base path

**Result:** Zero bare route string literals remain in the 4 updated files (verified with grep).

## URL Audit — 2026-05-06

**Task:** Find and centralize hardcoded external URLs in src/ and public/.

### Found

| File | URL | Dynamic? | Appears |
|------|-----|----------|---------|
| src/components/payment/PaymentDisplay.tsx:35 | https://venmo.com/?txn=pay | Yes (template literal) | 1x |
| src/components/payment/PaymentDisplay.tsx:67 | https://paypal.me/ | Yes (template literal) | 1x |
| src/components/Appointments.tsx:78 | https://calendar.google.com/calendar/render?... | Yes (template literal) | 1x |
| src/components/Appointments.tsx:95 | https://outlook.live.com/calendar/0/deeplink/compose?... | Yes (template literal) | 1x |
| src/config/app.ts | pikappoint.com emails | Already centralized | — |
| src/data/workers.ts | pikappoint.com emails | Mock/fixture data | — |
| public/**/*.md | Various third-party links | Markdown only | — |

### Decision

**No src/config/urls.ts created.** All external URLs found appear only once and are third-party service domains (Venmo, PayPal, Google, Microsoft) that are unlikely to change. Per task rules: single-occurrence, third-party, unlikely-to-change URLs stay inline. pikappoint.com emails already handled in src/config/app.ts.

---

## Task: Paid Badge on Org Pending Appointments

**Date:** 2025-07-19
**Requested by:** SteveQiu

### What Was Done

Added a "Paid" badge to each individual appointment row inside `renderGroupedPendingCard` in `src/components/Appointments.tsx`. This function renders grouped pending requests in org mode (`?mode=org`).

The badge appears inline with the action buttons (Approve/Reject/Cancel) for each booker row when that appointment has a payment proof submitted.

### Field Used

**`paidAppointmentIds.has(apt.id)`** — no new field needed. The component already queries `payment_proofs` table and builds a `Set<string>` of appointment IDs with submitted proofs. Reused this existing set.

### Badge Style

Matched existing Paid badge from `renderAppointmentCard`:
- variant="outline", green text/border, text-xs
- Dark mode aware via dark: variants

### Scope

- Only in `renderGroupedPendingCard` (org mode pending appointments)
- `renderAppointmentCard` already had a Paid badge (non-pending org + user views)
- No data fetching changes — reused existing `paidAppointmentIds` Set
- Build: passed


## Rules of Hooks: useState Must Be Top-Level

stateuseState MUST NOT be placed inside IIFEs, nested functions, or any scope other than the top-level of the component body. This is enforced by the Rules of Hooks. Violation causes app blank pages and unpredictable behavior.

**Example violation:**
\\\	sx
const MyComponent = () => {
  const handleClick = () => {
    const [value, setValue] = useState(); // ❌ WRONG
  };
}; 
\\\`n
**Correct:**
\\\	sx
const MyComponent = () => {
  const [value, setValue] = useState(); // ✓ CORRECT
}; 
\\\`n
## Husky Pre-Commit Hook: TypeScript Gate

Pre-commit hook now runs \
px tsc --noEmit\ on every commit. TypeScript errors block the commit. No exceptions.

**Purpose:** Prevent broken imports and TSX syntax from entering the repo. Appointments.tsx is particularly fragile and has gone blank 10+ times from committed import errors.

**Gate:** Mandatory. Commits cannot bypass this check. If \	sc\ fails, fix all errors before retrying commit.

---

## Location Field: Structure & Fix (2026)

**Requested by:** SteveQiu

**Location data structure:**
- Stored as JSON string in `openings.location` (type `string | null` in DB)
- JSON shape: `{ city: string, province: string, country: string, zip: string }`
- Created/serialized via `serializeLocation()` in `src/lib/address.ts`

**Bug:**
- `OpeningView.tsx` was rendering `{opening.location}` directly — outputs raw JSON string like `{"city":"Austin","province":"TX","country":"US","zip":"78701"}`

**Fix applied:**
- Added `import { parseLocation, formatLocation } from '@/lib/address'` to `OpeningView.tsx`
- Replaced both render sites with `{formatLocation(parseLocation(opening.location))}`
  - Line ~202: detail card (main content area)
  - Line ~305: booking confirmation dialog summary

**Pattern (canonical):** `formatLocation(parseLocation(raw))` — always use for read-only location display. Already used in `Appointments.tsx` and `ModifyAppointmentDialog.tsx`.

**Other files using location field:**
- `src/components/Appointments.tsx` — already fixed, uses `formatLocation(parseLocation(opening.location))`
- `src/components/ModifyAppointmentDialog.tsx` — already fixed, same pattern
- `src/components/BookingBrowse.tsx` — uses `parseLocation()` for filter logic (not display)
- `src/components/BrowseDetail.tsx` — check if location is displayed there too (no raw render found in this pass)

**tsc:** ✅ passed (exit code 0)

---

## 2026-05-06: Week dividers + inactive date filter fix

**Task:** Two bugs in Appointments.tsx

**Bug 1 — Week divider as group header:**
- Old: centered badge with lex-1 h-px on both sides and label in middle
- New: label as <p> header above full-width <div className="h-px bg-border" /> divider
- No top margin on first week header (pt === filteredNonPendingActive[0])

**Bug 2 — Date filter not applied to inactive:**
- Added ilteredInactive derived from pplyDateFilter(inactiveAppointments, dateFilter) in org view
- Replaced all inactiveAppointments references in render with ilteredInactive
- Empty state now says "No inactive appointments for this period." when filter active

**tsc:** ✅ passed (exit code 0)

---

## 2026-05-06 — Bug fixes: layout + filter UX

**Commit:** e896927

### Changes
- **App.tsx:** Removed max-w-7xl w-full mx-auto from both <main> elements (desktop panel + mobile). Content now fills full panel width — no mid-page scrollbar artifact.
- **Appointments.tsx:** Moved date filter buttons (All / Today / This Week / This Month) from mid-page (after pending cards, ~line 1233) up into the Filters Card, after the select row. Used lex-wrap gap-2 mt-3.
- Verified ilteredInactive was already wired in previous commit — no change needed.

### Learnings
- max-w-7xl mx-auto inside a resizable panel causes scrollbar to appear at the container boundary, not the viewport edge.
- Date filter placement in Filters Card makes it discoverable alongside search/status/worker filters.
- 	sc --noEmit pre-commit hook catches issues before push — always run.

### Sort Active/Inactive Appointments by Date (2026)

- `activeAppointments`: chained `.sort((a, b) => a.date.localeCompare(b.date))` after `.filter()` — ascending (earliest first)
- `inactiveAppointments`: chained `.sort((a, b) => b.date.localeCompare(a.date))` after `.filter()` — descending (most recent first)
- `apt.date` is `YYYY-MM-DD` string — lexicographic comparison is correct for ISO date sorting; no Date parsing needed
- Location: `src/components/Appointments.tsx` ~lines 503–508, immediately after `today` derivation
- Commit: `19e2f70`

## 2025 — Unify org/non-org appointments view UI

**Commit:** 646e002  
**Files:** src/components/Appointments.tsx

**Changes:**
- Removed isOrgView && guard from date filter buttons — now shown in both views
- ilteredNonPendingActive and ilteredInactive now always use pplyDateFilter (no conditional)
- showWeekDividers no longer gated on isOrgView
- Empty state messages use dateFilter !== 'all' without isOrgView guard

**Preserved org-only:** grouped pending cards, worker filter Select, notification bell, approval attribution

**Lesson:** When removing conditional guards, check all downstream empty-state branches too — multiple places used isOrgView && dateFilter !== 'all' pattern.

## Payment Filter Fix + Payment Required Tag + Totals (2026)

- `loadingPaymentInfoOpening` must be destructured from the opening query and added to the payment dialog spinner guard — omitting it allows unfiltered payment methods to flash before `paymentInfoOpening` resolves
- Bulk opening rates: `openingIds` useMemo + `useQuery(['opening-rates', openingIds])` selecting `id, hourly_rate`; `openingRateMap` useMemo(Map) for O(1) lookup per card
- `duration` in appointments table is in HOURS (same as openings, where Calendar.tsx uses `duration * 60` to get minutes and labels it `{opening.duration}h`); Appointments.tsx label `({apt.duration}min)` is a pre-existing display bug — actual values are 0.5, 1, 1.5, 2 etc.
- `getAppointmentTotal` is a plain function (not hook) — safe to call inside IIFE JSX expressions
- Total display formula: `rate * durationHours` with `> 24` guard for minutes-stored edge case
- `isFree` gating: if `rate === 0`, show "Free" and suppress Paid/Payment Required badges entirely
- Both card locations updated: pending group rows (`apt`) and `renderAppointmentCard` (`appointment`)
- IIFE `{(() => { ... })()}` pattern used twice per card: once for total span, once for Paid/Payment Required logic


### Marketing Landing Page (2026-05-06)

Built public/landing.html — standalone marketing page for PikAppoint.

**Stack:** HTML + Tailwind CDN (no build tools)
**Sections:** Nav, Hero, Features (4), How It Works (3 steps), CTA banner, Footer
**Design:** Deep indigo/purple (rand-600–rand-900), white bg, Inter font, mobile-first responsive
**Tech:** Inline SVG icons, SEO meta tags (og:title, description, viewport), support@pikappoint.com in footer

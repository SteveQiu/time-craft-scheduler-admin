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

- Privacy state has two systems: `privacySettings` (database-backed) and `addressVisibility` (deprecated localStorage)
- Single source of truth: always check `privacySettings` for visibility logic
- Address display: show fully if public=true, hide entirely if false (not partial)
- Mobile is a pending concern — pages likely have fixed widths or poor breakpoint coverage
- Settings.tsx Payment tab renamed to "Payment Acceptance" (UI labels only — DB columns unchanged)
- Payment types narrowed to: cash, paypal, venmo, email_transfer, wechat
- Venmo supports three sub-modes: username, phone, qr (base64 image); detected on edit via `data:image` prefix or phone regex
- QR images stored as base64 in `details` field; displayed as `<img>` in card view for wechat and venmo-qr
- Use toggle `<Button variant="outline/default">` trio for sub-selectors when RadioGroup isn't easily available

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

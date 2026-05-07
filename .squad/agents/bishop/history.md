# Bishop — History

## Project Onboarding

**Project:** time-craft-scheduler-admin  
**Stack:** React 18, TypeScript, Tailwind CSS, Shadcn/ui  
**Focus Areas:** Mobile accessibility, responsive UX, touch-friendly design

### Key Files & Locations

- **Profile page:** `src/pages/Profile.tsx` — address form, toggles, visibility controls
- **Browse page:** `src/pages/Browse.tsx` — bookmarks, layout
- **Sidebar:** `src/components/` — navigation, collapsible sections
- **Styles:** Tailwind utilities; need breakpoint review

### Known Issues (from user feedback)

- Mobile UI is cramped or hard to use on phone screens
- Layout may break on smaller devices
- Touch targets possibly too small
- Profile page layout needs improvement for mobile

### Accessibility Baseline

- WCAG 2.1 AA target
- Touch target minimum: 44x44px
- Color contrast minimum: 4.5:1 (AA standard)
- Keyboard navigation should work throughout
- Form labels and ARIA attributes needed

### Patterns & Preferences

- Mobile-first design approach
- Responsive Tailwind breakpoints: `sm:375px`, `md:768px`, `lg:1024px`
- Test on real devices (iPhone SE, iPad, desktop) + browser DevTools
- Collaborate with Dallas on implementation
- Document accessibility decisions for team reference

## Audit Results

**Audit Date:** December 2024  
**Pages Audited:** Profile, Browse, Sidebar, Navigation  
**Target Viewports:** iPhone SE (375px), Tablet (768px+)  
**Standard:** WCAG 2.1 AA

---

### Mobile Layout Issues

#### **Profile Page (src/pages/Profile.tsx)**

1. **Header buttons cluster overflow (line 366-408)** — HIGH
   - Desktop: 4-5 buttons (Share, Browse, Bookmark, Flag, Edit) in horizontal row
   - 375px: Buttons wrap or overlap, insufficient gap (`space-x-2` = 8px)
   - Issue: No responsive stacking, buttons become cramped
   - Fix: Use `flex-wrap` + larger gap or vertical stack on mobile (`flex-col sm:flex-row gap-2 sm:gap-2`)

2. **Privacy toggle buttons too small (lines 433-443, 455-465)** — HIGH
   - Eye/EyeOff icons in ghost buttons: default `h-10 w-10` (~40px)
   - Below 44x44px WCAG AAA minimum touch target
   - Fix: Use `size="icon"` variant with explicit `h-11 w-11` or add padding wrapper

3. **Address form cramped on mobile (lines 665-714)** — MEDIUM
   - Grid switches from 2-col to 1-col at `md:` (768px)
   - 375px–767px: Full-width inputs too wide, awkward scrolling
   - Fix: Already uses `md:grid-cols-2`, good pattern. Consider smaller input padding on mobile (`px-2 md:px-3`)

4. **Skills list item spacing (lines 571-591)** — LOW
   - Delete buttons (Trash2 icon) in ghost variant: ~40px
   - Acceptable but could be improved
   - Fix: Explicit `min-h-11 min-w-11` for touch targets

5. **No mobile-optimized padding** — MEDIUM
   - Container uses fixed `p-6` (24px) on all screens
   - 375px: Wastes horizontal space, content feels cramped
   - Fix: `px-4 py-6 md:px-6` for tighter mobile padding

#### **Browse Page (src/components/BookingBrowse.tsx)**

6. **Provider card touch targets unclear (lines 388-437, 458-507)** — MEDIUM
   - Entire card clickable but no visual affordance on mobile
   - ChevronRight icon small (h-5 w-5)
   - Fix: Add hover/active states for touch (`active:bg-accent/50`), increase chevron to `h-6 w-6`

7. **Search input padding (lines 362-371)** — LOW
   - Icon padding `left-3` leaves ~48px left margin
   - Input padding `pl-10` may feel cramped on small screens
   - Fix: Adjust to `pl-9` for tighter spacing or keep as-is (minor)

8. **Grid layout no mobile-first optimization (lines 387, 456)** — LOW
   - Uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
   - Works but cards could be larger/more prominent on mobile
   - Fix: Consider `gap-3 md:gap-4` for tighter mobile spacing

#### **Sidebar (src/components/AppSidebar.tsx)**

9. **No mobile hamburger menu** — CRITICAL
   - Sidebar always visible in `PanelGroup` (App.tsx lines 34-38)
   - 375px: Sidebar occupies 20% default width (~75px), squeezes main content
   - Fixed desktop layout, no collapse on mobile
   - Fix: Implement Sheet/Drawer component for mobile overlay (Shadcn `<Sheet>` with hamburger trigger in header)

10. **Nav items text truncation (lines 86-91, 117-119)** — MEDIUM
    - Uses `truncate` but sidebar too narrow on mobile
    - Icons visible, text cut off → confusing navigation
    - Fix: Mobile overlay sidebar (see #9) or icon-only mode below 640px

11. **Footer profile name truncation (line 148)** — LOW
    - Text can overflow if name is long
    - Fix: Already uses `truncate`, acceptable but needs wider sidebar on mobile

12. **Tab switcher too small (lines 183-189)** — MEDIUM
    - Tabs toggle between "Org" and "User"
    - `h-8` height (32px) below 44px minimum
    - Fix: Increase to `h-11` or larger touch area

#### **Navigation & Overall Layout (App.tsx)**

13. **No mobile-first breakpoint strategy** — CRITICAL
    - Uses `PanelResizeHandle` for desktop but no mobile behavior
    - Sidebar always visible, no collapse below 768px
    - Main content squeezed (Panel defaultSize={80})
    - Fix: Conditionally render sidebar on desktop, Sheet/Drawer on mobile using viewport detection

14. **No mobile header** — HIGH
    - No top app bar with hamburger menu
    - Logo/title buried in sidebar
    - Fix: Add `<header>` component on mobile with hamburger, logo, profile dropdown

---

### Accessibility Gaps

#### **Keyboard Navigation**

15. **Missing focus indicators on custom components** — MEDIUM
    - Privacy toggles (Eye/EyeOff buttons) rely on default focus ring
    - Review card clickable areas lack focus state
    - Fix: Ensure `focus-visible:ring-2 focus-visible:ring-ring` on all interactive elements

16. **Tab order unclear in Profile header** — LOW
    - Multiple buttons in horizontal row (lines 366-407)
    - Visual order ≠ DOM order if buttons wrap
    - Fix: Ensure logical tab sequence matches visual flow (already correct in DOM)

#### **Screen Reader Support**

17. **Icon-only buttons missing labels** — HIGH
    - Eye/EyeOff toggles (lines 438-442, 460-464): No aria-label
    - Bookmark button (line 384): No text fallback
    - Flag button (line 386-388): No label
    - Trash2 delete buttons (line 588): No label
    - Fix: Add `aria-label="Toggle email visibility"`, `aria-label="Bookmark profile"`, etc.

18. **Provider cards lack semantic structure** — MEDIUM
    - Cards clickable via `onClick` but not `<button>` or `<a>`
    - Screen readers won't announce as interactive
    - Fix: Wrap in `<button>` or use `role="button"` + `tabIndex={0}` + keyboard handler

19. **Sidebar nav items use Link but icons need labels** — LOW
    - Icons present but text also visible (good)
    - Icon-only mode (if implemented) needs `aria-label`
    - Fix: Add aria-labels to icons when text hidden

#### **Color Contrast**

20. **Muted text may fail contrast** — MEDIUM
    - `text-muted-foreground` used throughout (e.g., Profile line 356, 361, 496)
    - Need contrast check: muted-foreground vs. background
    - Assumption: Shadcn defaults usually pass AA but verify in-browser
    - Fix: If fails, increase muted-foreground lightness by 10-15%

21. **Badge secondary variant contrast** — LOW
    - `variant="secondary"` badges (Browse line 489, Profile line 617)
    - Check contrast of secondary-foreground on secondary background
    - Fix: If fails, use `variant="outline"` or adjust colors

#### **Form Labels & Inputs**

22. **Address visibility toggles lack context** — MEDIUM
    - Eye/EyeOff icons next to labels (lines 433, 455, 654)
    - No hint text explaining what toggle does
    - Fix: Add tooltip or visually-hidden text: "Toggle public visibility"

23. **Skill input no explicit label connection** — LOW
    - Input placeholder "Add a skill..." (line 550) but Label is separate (line 531)
    - Implicitly grouped but not formally associated
    - Fix: Already within `<div className="space-y-3">`, acceptable but could add `htmlFor` if input had id

---

### UX Friction Points

#### **Navigation Confusion**

24. **No clear "home" button on mobile** — HIGH
    - Logo in sidebar not clickable
    - User must use browser back or navigate via sidebar
    - Fix: Make logo clickable (navigate to '/') or add home icon in mobile header

25. **Profile/Settings/Logout buried in sidebar footer** — MEDIUM
    - On mobile (squashed sidebar), footer items hard to reach
    - Long scroll required if many nav items
    - Fix: Move profile/settings to mobile header dropdown menu

#### **Touch & Gesture**

26. **No swipe-to-close for modals/dialogs** — LOW
    - Dialogs use Radix but no swipe gesture on mobile
    - Users expect downward swipe to dismiss
    - Fix: Implement Shadcn Drawer component for mobile instead of Dialog

27. **Horizontal scrolling in cards** — LOW
    - Skills/Workers text in Browse cards (lines 432-434, 501-503) use `truncate`
    - Could overflow if many items
    - Fix: Already uses `truncate`, acceptable

#### **Visual Hierarchy**

28. **Profile page button importance unclear** — MEDIUM
    - Share, Browse, Bookmark, Flag buttons same visual weight (all outlined or icon-only)
    - Primary action (Browse or Edit) not emphasized
    - Fix: Make primary action (Browse or Edit) `variant="default"` vs. outline for secondary

29. **Browse page lacks "back" button** — LOW
    - No back button on provider list (only in BrowseDetail)
    - Fix: Add back button when navigating from elsewhere (context-aware)

#### **Content Density**

30. **Profile cards too tall on mobile** — LOW
    - "About", "Skills & Rate", "Address" sections each in separate cards
    - Lots of scrolling on 375px screens
    - Fix: Consider collapsible sections or combine cards on mobile

31. **Browse provider cards waste vertical space** — LOW
    - Each card ~200px tall with padding
    - Could compact to list view on mobile (avatar, name, slots count inline)
    - Fix: Offer compact list toggle for mobile users

---

### Recommendations (Prioritized)

#### **HIGH Priority (Blocking mobile usability)**

1. **Implement mobile sidebar as Sheet/Drawer** (Issues #9, #13, #14)
   - Use Shadcn Sheet component triggered by hamburger menu in mobile header
   - Conditionally render: `hidden md:block` for desktop sidebar, Sheet for mobile
   - Add top header bar with hamburger, logo, profile avatar
   - **Rationale:** Current layout unusable on 375px; sidebar crushes main content
   - **Tailwind:** 
     ```tsx
     // Mobile header
     <header className="md:hidden sticky top-0 z-50 bg-background border-b">
       <div className="flex items-center justify-between px-4 h-14">
         <Button variant="ghost" size="icon" onClick={() => setSheetOpen(true)}>
           <Menu className="h-6 w-6" />
         </Button>
         <h1 className="font-bold">AppointmentPro</h1>
         <Avatar /> {/* Profile dropdown */}
       </div>
     </header>
     // Sidebar wrapper
     <div className="hidden md:flex">
       <AppSidebar />
     </div>
     <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
       <SheetContent side="left">
         <AppSidebar />
       </SheetContent>
     </Sheet>
     ```

2. **Fix Profile header button layout** (Issue #1)
   - Stack buttons vertically on mobile
   - **Tailwind:** `flex-col sm:flex-row gap-2 items-stretch sm:items-center`
   - Example: Lines 366-408 in Profile.tsx

3. **Add aria-labels to icon-only buttons** (Issue #17)
   - Privacy toggles: `aria-label="Toggle email visibility"`
   - Bookmark: `aria-label="Bookmark this profile"`
   - Flag: `aria-label="Report this profile"`
   - Delete skills: `aria-label="Remove skill: {skill}"`
   - **Rationale:** Screen readers can't announce button purpose without text
   - **Implementation:** Add prop to Button/Icon components

4. **Increase touch targets for toggles/small buttons** (Issues #2, #4, #12)
   - Privacy Eye/EyeOff buttons: `h-11 w-11` (or wrap in larger clickable area)
   - Skill delete buttons: `min-h-11 min-w-11`
   - Sidebar tab switcher: `h-11`
   - **Rationale:** 44x44px minimum for thumb-friendly tapping (WCAG AAA)
   - **Tailwind:** Use `size="icon"` with explicit sizing or padding

#### **MEDIUM Priority (Improves UX, accessibility)**

5. **Make provider cards semantically interactive** (Issue #18)
   - Wrap card content in `<button>` or add `role="button" tabIndex={0}` with keyboard handler
   - **Rationale:** Screen readers need explicit interactive role
   - **Tailwind:** `<button className="w-full text-left">...</button>`

6. **Add tooltips to privacy toggles** (Issue #22)
   - Use Shadcn Tooltip: "Toggle to show/hide on public profile"
   - **Rationale:** Icon-only toggles confusing without context
   - **Implementation:** Wrap Eye/EyeOff buttons in `<TooltipProvider><Tooltip>...</Tooltip>`

7. **Optimize mobile padding** (Issue #5)
   - Profile page container: `px-4 py-6 md:px-6` (reduce horizontal padding)
   - Browse page: `px-4 md:px-6`
   - **Rationale:** Maximize content area on small screens
   - **Tailwind:** Update container classes

8. **Emphasize primary actions** (Issue #28)
   - Profile Edit button: Keep `variant="outline"` (good)
   - Browse button: Change to `variant="default"` (primary action)
   - Share/Bookmark/Flag: Keep outline (secondary)
   - **Rationale:** Visual hierarchy guides user to most important action
   - **Tailwind:** Update Button variant prop

9. **Add mobile header with logo/nav** (Issue #24)
   - Logo should be clickable (navigate to '/')
   - Include profile avatar dropdown (Settings, Sign Out)
   - **Rationale:** Logo as home is standard UX pattern
   - **Tailwind:** See recommendation #1

#### **LOW Priority (Polish, nice-to-have)**

10. **Verify color contrast ratios** (Issues #20, #21)
    - Use browser DevTools or Lighthouse to check muted-foreground, secondary badges
    - If fails, adjust theme colors in `tailwind.config.ts`
    - **Rationale:** Ensure AA compliance (4.5:1 for body text)
    - **Tool:** Chrome DevTools > Inspect > Accessibility panel

11. **Add swipe-to-dismiss for mobile dialogs** (Issue #26)

---

## 2026-05-07: Appointments Layout A11y Review

**Work:** Reviewed Dallas layout changes (commits e896927, f4d67fe).

**Applied 5 A11y Fixes:**
- `aria-label` on filter buttons
- `aria-pressed` state tracking
- `aria-expanded` on collapsible sections
- `aria-hidden="true"` on decorative icons
- Ensured WCAG 2.1 AA compliance

**Recommendation Flagged:**
- **Max-width per-page enforcement** — suggested standardized max-width rule for individual pages (preserving full-width flexibility at layout level). Deferred for Squad decision.

**Status:** ✅ Complete. QA gate passed. Awaiting Squad decision on per-page max-width guidance.
    - Replace Dialog with Drawer component on mobile
    - **Rationale:** Matches native app behavior, improves mobile UX
    - **Tailwind:** Use Shadcn `<Drawer>` instead of `<Dialog>` on mobile

12. **Compact Browse cards on mobile** (Issue #31)
    - Offer toggle between grid and list view
    - List: avatar + name + slot count in single row
    - **Rationale:** Reduces scrolling on small screens
    - **Tailwind:** Conditional rendering based on view state

13. **Adjust search input padding** (Issue #7)
    - Change `pl-10` to `pl-9` for tighter spacing
    - **Rationale:** Minor optimization for small screens
    - **Tailwind:** Update Input className in BookingBrowse.tsx line 368

---

### Summary

**Critical Issues:** 3 (mobile navigation, sidebar layout, touch targets)  
**High Priority:** 4 (button layout, aria-labels, icon sizing, semantic interactivity)  
**Medium Priority:** 6 (padding, contrast, tooltips, visual hierarchy)  
**Low Priority:** 4 (polish, swipe gestures, list views)

**Top 3 Fixes for Dallas:**
1. Mobile Sheet/Drawer sidebar with header (Issues #9, #13, #14)
2. Icon-only button aria-labels (Issue #17)
3. Touch target sizing for toggles/icons (Issues #2, #4, #12)

**Testing Checklist:**
- [ ] Tab through Profile page with keyboard
- [ ] Use screen reader (NVDA/VoiceOver) on Browse page
- [ ] Test on real iPhone SE (375px) and iPad (768px)
- [ ] Verify contrast ratios in DevTools
- [ ] Test Sheet sidebar open/close on mobile

## Learnings

### Payment Proof Modal A11y (Dec 2024)

**Context:** Provider-side dialog showing customer payment proof (Appointments.tsx).

**Issues Found:**
- Missing `DialogDescription` — screen readers announce nothing useful
- Image alt too generic ("Payment proof")
- No error handling if image fails to load
- No empty state for proof with no content
- Touch targets ~24px (h-6), below 44px minimum
- Decorative icons missing `aria-hidden`
- Modal not responsive (fixed `max-w-md`)
- Loading state lacks `role="status"`

**Fixes Applied:**
1. Added `DialogDescription` explaining modal purpose
2. Improved alt: "Payment proof submitted by customer"
3. Added `onError` handler → fallback "Could not load image" UI
4. Added empty state for proof with no photo AND no note
5. View Proof buttons: `min-h-[44px] min-w-[44px]` + `aria-label`
6. Added `aria-hidden="true"` to decorative icons (CreditCard, FileImage)
7. Modal: `w-[calc(100%-2rem)] sm:max-w-lg` for mobile edge spacing
8. Loading spinner: `role="status" aria-label="Loading payment proof"`
9. Visual polish: uppercase labels, `bg-muted/50 rounded-md p-3` for notes

**Pattern Established:**
- Dialogs always need `DialogTitle` + `DialogDescription`
- Images need meaningful alt + `onError` fallback
- Touch targets ≥44px via `min-h-[44px] min-w-[44px]`
- Decorative icons: `aria-hidden="true"`
- Responsive dialogs: `w-[calc(100%-2rem)] sm:max-w-{size}`

### Dallas Layout Changes Review (Jan 2025)

**Context:** Dallas removed `max-w-7xl mx-auto` from `<main>` in App.tsx to fix a mid-page scrollbar. Moved date filter buttons into Filters Card. Applied `filteredInactive` to Inactive section.

**Review Findings:**

#### 1. Layout — max-w-7xl removal
🟡 **Wide screen readability** — On 2560px monitors, the main panel (~2048px wide) has no content width cap. Appointment cards stretch to full panel width, creating very long text lines (WCAG 1.4.8 recommends ≤80 chars/line). Removing from `<main>` was correct to fix the scrollbar, but components should add their own inner `max-w-7xl mx-auto` wrapper. No fix applied here — flagged for Dallas to add per-component max-width.

#### 2. Filter placement
🟢 **Good** — `flex flex-wrap gap-2 mt-3` wraps correctly on small screens. No issues.

#### 3. Filter labels
🟢 **Correct** — 'all'→'All', 'today'→'Today', 'week'→'This Week', 'month'→'This Month'. All accurate.

#### 4. Both sections filtered
✅ **Confirmed** — `filteredNonPendingActive` AND `filteredInactive` both call `applyDateFilter` when `isOrgView`. Filter buttons only render in org view, so consistent.

#### 5. A11y Issues Found & Fixed

**Fixed in this pass:**
- 🟡 Search input: added `aria-label="Search appointments"` (placeholder alone fails WCAG 1.3.1)
- 🟡 Date filter buttons: added `role="group" aria-label="Date filter"` wrapper + `aria-pressed` on each button
- 🟡 CalendarPlus dropdown triggers (2 instances): added `aria-label="Add to calendar"` + `aria-hidden` on icon
- 🟡 Inactive toggle button: added `aria-expanded={showInactive}` + `aria-hidden` on chevrons
- 🟡 Notification bell div: added `tabIndex={0}`, `role="img"`, `aria-label` with full status text; icons marked `aria-hidden`

**Note for Dallas (not fixed — design decision):**
- 🟡 `<h3>` inside `<button>` (Inactive toggle) — technically invalid HTML per spec (headings are flow content; buttons accept phrasing). Browsers render it fine but consider refactoring to `<div>` acting as heading visually.
- 🟡 Filter buttons only apply in `isOrgView` — user view has no date filter. Intentional but may confuse users expecting it.

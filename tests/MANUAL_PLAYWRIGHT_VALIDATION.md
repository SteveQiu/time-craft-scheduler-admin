# Manual Playwright Validation Guide

## Overview

Since automated Playwright tests require a running dev server, this guide provides step-by-step manual validation for the two fixes.

## Prerequisites

1. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Wait until you see: `VITE v5.x.x ready in XXX ms`

2. **Open Firefox or Chrome:**
   - Use the browser URL: `http://localhost:8080`

## Fix #1: Calendar Blinking Fix - Loading State Management

### What Was Fixed
- **Issue:** Calendar openings blinked when loading in org mode (`?mode=org`)
- **Root Cause:** `loadOpeningsForMonth()` had no loading state, causing DOM flicker
- **Fix:** Added `setLoading(true)` at start and `setLoading(false)` in finally block

### Manual Validation Steps

#### Test 1: Load calendar without blinking
1. Navigate to: `http://localhost:8080/calendar?mode=org`
2. **Observe:** Do openings appear smoothly WITHOUT flickering?
3. **Expected:** Openings display in a single render, not disappear/reappear
4. **Pass Criteria:** No visible blink or flicker during initial load

**Screenshot/Notes:**
```
Load time: _______
Blinking observed: Yes / No
Openings count: _______
```

#### Test 2: Month navigation stability
1. From the calendar, click the **"Next"** button to go to next month
2. **Observe:** Do openings smoothly transition to the next month?
3. **Expected:** New month's openings load smoothly, no flicker
4. **Pass Criteria:** Month transition is fluid without visual artifacts

**Screenshot/Notes:**
```
Navigation smooth: Yes / No
Previous month visible: Yes / No
Current openings count: _______
```

#### Test 3: DOM Stability Check
1. Open **Developer Tools** (F12 or Right-click → Inspect)
2. Go to **Console** tab
3. Paste this code and run it:
   ```javascript
   // Monitor DOM mutations during load
   let mutations = 0;
   const observer = new MutationObserver(() => {
     mutations++;
     if (mutations <= 5) console.log(`Mutation ${mutations}`);
   });
   observer.observe(document.body, { childList: true, subtree: true });
   
   // Check every 500ms
   setInterval(() => {
     console.log(`Total mutations so far: ${mutations}`);
   }, 500);
   ```
4. **Reload page** and observe console output
5. **Expected:** Mutations should be < 20 during initial load
6. **Pass Criteria:** Low mutation count = stable DOM

#### Test 4: Loading State Visibility
1. Open DevTools → Network tab
2. Set throttling to **"Slow 3G"** to simulate slow network
3. Refresh the page
4. **Observe:** Is there a visual loading indicator (spinner, skeleton)?
5. **Pass Criteria:** Loading state visible while data fetches

### Code Changes Verified
- ✅ `src/components/Calendar.tsx` line 168: `setLoading(true)` added
- ✅ `src/components/Calendar.tsx` lines 211-213: `setLoading(false)` in finally block
- ✅ Loading indicator renders based on `loading` state

---

## Fix #2: Appointments Org View Fix - acceptedWorkers Filtering

### What Was Fixed
- **Issue:** Appointments didn't show in org view on `/appointments?mode=org`
- **Root Cause:** Component using `all workers` instead of `acceptedWorkers` (invited workers have `user_id=null`)
- **Fix:** Updated to import and use `acceptedWorkers` from hook

### Manual Validation Steps

#### Test 1: Appointments display in org mode
1. Navigate to: `http://localhost:8080/appointments?mode=org`
2. **Observe:** Are there any appointments displayed?
3. **Expected:** Appointments from org workers should be visible
4. **Pass Criteria:** At least one appointment visible OR clear empty state

**Screenshot/Notes:**
```
Appointments visible: Yes / No
Count: _______
Provider names shown: Yes / No
```

#### Test 2: Appointments remain after page reload
1. From appointments page, observe the appointments list
2. **Press F5** to reload the page
3. **Wait** for page to fully load
4. **Observe:** Are the same appointments still visible?
5. **Expected:** Identical appointments after reload (content stable)
6. **Pass Criteria:** No flickering, same content appears

**Screenshot/Notes:**
```
Before reload - count: _______
After reload - count: _______
Content matches: Yes / No
```

#### Test 3: HTML Structure Inspection
1. Open **Developer Tools** (F12)
2. Go to **Elements** tab
3. Find an appointment item in the DOM
4. **Verify it contains:**
   - Provider name (worker name)
   - Date/time information
   - Status (confirmed, pending, etc.)
5. **Pass Criteria:** All expected fields present

**HTML Structure Found:**
```
<div class="appointment-item">
  Provider: ___________
  Date: ___________
  Status: ___________
</div>
```

#### Test 4: Filter Verification (acceptedWorkers)
1. Open **Console** tab in DevTools
2. Paste this code:
   ```javascript
   // Get all visible providers
   const appointments = document.querySelectorAll('[data-testid="appointment-item"]');
   const providers = Array.from(appointments)
     .map(a => a.textContent)
     .filter(t => t.trim().length > 0);
   console.log(`Found ${appointments.length} appointments`);
   console.log('Sample:', providers.slice(0, 3));
   ```
3. **Run** and check console output
4. **Verify:** Providers should be from your organization
5. **Pass Criteria:** Appointments are from org members, not random providers

#### Test 5: Visual Regression - Screenshot
1. Take a **screenshot** of the appointments page
2. **Filename:** `appointments-page-load.png`
3. **Save location:** `tests/snapshots/appointments/`
4. **Note any visual issues:**
   - Layout broken?
   - Text cut off?
   - Colors wrong?

### Code Changes Verified
- ✅ `src/components/Appointments.tsx` line 43: Import `acceptedWorkers`
- ✅ `src/components/Appointments.tsx` line 58: Use in queryKey
- ✅ `src/components/Appointments.tsx` lines 69-71: Filter by `acceptedWorkers`

---

## Validation Checklist

### Calendar Blinking Fix
- [ ] Test 1: Load without blinking - PASS/FAIL
- [ ] Test 2: Month navigation smooth - PASS/FAIL
- [ ] Test 3: Low DOM mutation count (< 20) - PASS/FAIL
- [ ] Test 4: Loading state visible on slow network - PASS/FAIL
- [ ] Code changes verified in source files - PASS/FAIL

### Appointments Org View Fix
- [ ] Test 1: Appointments display in org mode - PASS/FAIL
- [ ] Test 2: Appointments stable after reload - PASS/FAIL
- [ ] Test 3: HTML structure contains expected fields - PASS/FAIL
- [ ] Test 4: Providers are from org members - PASS/FAIL
- [ ] Test 5: Visual regression screenshot taken - PASS/FAIL
- [ ] Code changes verified in source files - PASS/FAIL

---

## Automated Playwright Tests (When Dev Server Available)

Once manual validation passes, run automated tests:

```bash
# Update snapshots for future comparisons
npm test -- --update-snapshots

# Run calendar blinking tests
npm test tests/validate-blinking-fix.spec.ts --headed

# Run appointments org view tests
npm test tests/validate-appointments-org-view.spec.ts --headed

# View test report
npm run test:report
```

---

## Troubleshooting

### Calendar not loading?
1. Check console for errors (F12 → Console)
2. Check Network tab for failed requests
3. Verify you're in org mode: `?mode=org` parameter should be in URL

### Appointments page blank?
1. Ensure you're signed in to an org account
2. Check if org has any workers
3. Check console for error messages

### Dev server won't start?
1. Verify node_modules installed: `npm install` or `bun install`
2. Check for port conflicts (8080 in use)
3. Try: `npm run build` first, then `npm run dev`

---

## Passing Criteria

**Calendar Blinking Fix is VALID if:**
- ✅ No visual blinking observed during page loads
- ✅ Month transitions are smooth
- ✅ DOM mutations are minimal (< 20)
- ✅ Loading state appears on slow networks

**Appointments Org View Fix is VALID if:**
- ✅ Appointments display in org mode
- ✅ Content remains stable across page reloads
- ✅ HTML contains expected fields
- ✅ Only org workers' appointments visible

---

## Document Validation Results

Save results to: `tests/MANUAL_VALIDATION_RESULTS.md`

Example format:
```markdown
# Manual Validation Results
Date: 2024-04-21

## Calendar Blinking Fix
- Blinking: PASS
- Month navigation: PASS
- DOM stability: PASS (8 mutations)
- Loading state: PASS

## Appointments Org View Fix
- Display in org mode: PASS
- Stability after reload: PASS
- HTML structure: PASS
- Provider filtering: PASS

## Overall Status: ✅ VALID
```

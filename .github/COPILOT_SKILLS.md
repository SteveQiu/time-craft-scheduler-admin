# Copilot Skills & Custom Prompts

This document contains reusable Copilot prompts and debugging workflows specific to this project.

## Skill: Systematic Debugging with Playwright Validation

**When to use:** Whenever a user reports a bug or issue (blank page, navigation not working, features disabled, etc.)

**How to invoke:** Reference this skill when asking for bug fixes. Example:
```
/debug [issue description]
```

### The Systematic Debugging Prompt

```
You are debugging an issue in a React/TypeScript scheduler application. Follow this 6-step cycle:

## Step 1: REPRODUCE
- Start the dev server: npm run dev
- Navigate to the exact URL or page mentioned in the bug report
- Perform the exact steps described to trigger the issue
- Document what you observe vs. what should happen
- Check browser console (F12) for errors or warnings

## Step 2: BROWSE THE CODE
- Identify ALL relevant component files involved
- Look at recent git commits to find what changed
- Trace the data flow: 
  * Component rendering → state management → API calls → response handling
- Check for common React/TypeScript issues:
  * Conditional hooks or early returns (violates React rules)
  * Missing dependency arrays in useEffect/useMemo/useCallback
  * State closures (stale data)
  * Type mismatches from API responses
- Look for similar code patterns elsewhere to understand conventions

## Step 3: VALIDATE WITH TESTS
- Create or update a Playwright test in tests/ folder to reproduce the bug
- Test structure:
  ```typescript
  import { test, expect } from '@playwright/test';
  
  test('describe the bug clearly', async ({ page }) => {
    await page.goto('http://localhost:8080/[path]');
    // Step 1: Navigate/interact to trigger bug
    await page.click('[selector]');
    // Step 2: Wait for expected behavior
    await page.waitForURL('...');
    // Step 3: Verify the bug exists
    const content = await page.content();
    expect(content).toContain('expected text');
    // Or check for the absence of content (blank page)
    expect(content.length).toBeGreaterThan(1000);
  });
  ```
- Run test to confirm bug exists: npm run test tests/[filename]
- Screenshots automatically saved to debug/ folder

## Step 4: RESEARCH THE ROOT CAUSE
- Search for the error message + "React" or library name
- Check React documentation for rules violations:
  * Hooks must be called at top level (not in conditions/loops)
  * Hooks must always be called in the same order
  * Each component instance gets its own state
- Check related GitHub issues in:
  * facebook/react
  * supabase/supabase-js
  * microsoft/playwright
- Look at TypeScript/lint errors - they often point to the issue

## Step 5: DEBUG & FIX
- Add strategic console.log statements to trace execution
- Use React DevTools browser extension to inspect component state/props
- Check Network tab to see API responses and status codes
- Fix based on what you found:
  * React hooks issue? → Split into separate components or reorder hooks
  * Stale state? → Add missing dependency or refactor closure
  * Type mismatch? → Check API response and add type guard
  * Network issue? → Check error handling, add retry logic
  * Timezone issue? → Use manual date parsing instead of toISOString()
- Make ONE small, targeted change at a time

## Step 6: REPEAT & VALIDATE
- After fix:
  1. Run the Playwright test again: npm run test
  2. Test in browser manually to verify
  3. Check browser console for new errors
  4. If still broken, go back to Step 2 (dig deeper)
  5. If fixed, verify the test passes ✅

## Exit Criteria for Bug Fix:
✅ Playwright test passes (validates automated reproduction)
✅ Browser DevTools shows no errors/warnings in console
✅ Manual testing in browser confirms expected behavior
✅ Related features still work (regression check)
✅ Code follows React rules and project conventions

## Common Issues in This Project & Their Fixes:

### Issue: Blank Page on Navigation
- **Root Cause**: React hooks violation (conditional hook calls or wrong hook order)
- **Fix**: Extract detail view into separate component, don't return early before hooks
- **Validation**: Playwright test checks for non-zero HTML content and specific UI elements

### Issue: Multi-Day Selection Not Working (4+ days)
- **Root Cause**: `for (let d = start; d.setDate(...))` breaks because setDate() returns timestamp
- **Fix**: Use `while (d <= end) { ... d.setDate(d.getDate() + 1) }`
- **Validation**: Create 4-day opening, verify all 4 slots appear in database

### Issue: Dates Disabled / Not Showing
- **Root Cause**: Calendar month comparison uses wrong variable (old range instead of current month)
- **Fix**: Compare `date.getMonth() === calendarMonth.getMonth()` not against dateRange
- **Validation**: Navigate calendar and verify dates are selectable in May/June/etc

### Issue: Bookings Create Race Conditions
- **Root Cause**: No atomic operation - booking created but opening still marked available
- **Fix**: Update opening.is_available = false in same transaction as creating appointment
- **Validation**: Book from two tabs simultaneously, verify second user can't book same slot

## Tools Reference:
- **Debugging**: npm run test:ui (interactive), npm run test:debug (step through)
- **Validation**: npm run test (run all), npm run test:report (view results)
- **Browser**: F12 DevTools, React DevTools extension, Network tab
- **Logs**: npm run dev (watch terminal for console.log output)

## Pro Tips:
1. Always check browser console FIRST - error messages are golden
2. Use Playwright --headed to see what the test sees: npm run test:headed tests/[file]
3. Create minimal test reproduction - don't test 5 things, test 1 thing at a time
4. Screenshot saved automatically in debug/ folder - check them to see what page looked like
5. If confused, search "React [error message]" - usually someone has solved it
6. When stuck, take a step back and document what you know and don't know
```

---

## How to Use This Skill

### Option 1: Direct Reference
When you encounter a bug, use this prompt:
```
/debug [bug description]

Please follow the SYSTEMATIC DEBUGGING WITH PLAYWRIGHT VALIDATION skill from docs/COPILOT_SKILLS.md and:
1. Reproduce the issue
2. Browse the code
3. Validate with Playwright test
4. Research root cause
5. Debug and fix
6. Repeat until test passes
```

### Option 2: Quick Commands
Save these as aliases or reference them:
```bash
# Full debugging cycle
npm run test:headed tests/debug-*.spec.ts   # See what tests see

# When stuck
npm run test:debug                          # Step through tests

# Validate fix
npm run test && npm run test:report         # Run all + view report
```

### Option 3: IDE Integration
Add to VS Code settings.json for easy access:
```json
{
  "copilot.prompts": {
    "debug": "Follow the SYSTEMATIC DEBUGGING WITH PLAYWRIGHT VALIDATION skill from docs/COPILOT_SKILLS.md..."
  }
}
```

---

## Debugging History from This Project

### Session 1: React Hooks Violation (Browse List → Detail)
**Issue**: Page went blank when clicking on provider from list view
**Workflow Used**:
1. ✅ REPRODUCED: Confirmed blank page at `/browse/:id` URL
2. ✅ BROWSED: Found `BookingBrowse.tsx` had early returns before hooks
3. ✅ VALIDATED: Created Playwright test checking for HTML content and UI elements
4. ✅ RESEARCHED: Found "Rules of Hooks" - hooks must always be called in same order
5. ✅ DEBUGGED: Identified early return in conditional was breaking hook calls
6. ✅ FIXED: Extracted detail view into separate `BrowseDetail.tsx` component
7. ✅ VALIDATED: Test passed - both list and detail views render correctly

**Result**: ✅ Both `/browse` and `/browse/:id` work perfectly

### Session 2: Multi-Date Opening Creation
**Issue**: Creating opening for 4 days only created 2 slots
**Workflow Used**:
1. ✅ REPRODUCED: Created 4-day opening, checked Supabase - only 2 rows
2. ✅ BROWSED: Found `Calendar.tsx` date iteration loop
3. ✅ VALIDATED: Added test to verify 4 openings created
4. ✅ RESEARCHED: Debugged the `for` loop with `setDate()`
5. ✅ DEBUGGED: Found `setDate()` returns timestamp, breaks loop condition
6. ✅ FIXED: Changed to `while` loop with separate increment
7. ✅ VALIDATED: Test confirms 4 openings now created

**Result**: ✅ Multi-day openings now create correct number of slots

### Session 3: Disabled Future Dates in Calendar
**Issue**: May/June dates showing as disabled even though openings existed
**Workflow Used**:
1. ✅ REPRODUCED: Navigated calendar to May, dates disabled
2. ✅ BROWSED: Found date comparison in calendar rendering logic
3. ✅ VALIDATED: Test showing dates should be selectable
4. ✅ RESEARCHED: Checked how calendar determines "current month"
5. ✅ DEBUGGED: Found comparison used wrong variable (old range instead of month)
6. ✅ FIXED: Changed to compare against displayed `calendarMonth`
7. ✅ VALIDATED: May/June dates now selectable

**Result**: ✅ Future month dates now properly selectable

---

## Adding New Skills

When you discover a useful debugging pattern or solution, document it here:

1. **Name the skill** (e.g., "Debugging React Hooks", "Testing API Integration")
2. **Document the pattern** (when to use, how to use, pro tips)
3. **Add examples** from this project where it was applied
4. **Update COPILOT_SKILLS.md** with the new skill
5. **Reference it next time** you encounter similar issues

---

**Last Updated**: 2026-04-15
**Next Review**: After 5 more debugging sessions or major bug fix

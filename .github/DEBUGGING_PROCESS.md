# Debugging Process Guide

This document outlines the systematic debugging workflow used in this project. Follow this cycle to identify and fix issues efficiently.

## The Debug Cycle: Reproduce → Browse → Validate → Research → Debug → Repeat

### Step 1: **Reproduce the Issue**
- Start the development server: `npm run dev`
- Navigate to the specific URL or page mentioned in the bug report
- Perform the exact steps to trigger the issue
- Document what you observe vs. what should happen

**Tools:**
- Browser DevTools (F12) - check console for errors
- Network tab - see API calls and responses
- Application tab - inspect component state and props

### Step 2: **Browse the Code**
- Identify the relevant component(s) involved in the issue
- Look for recent changes in `git log` that might have introduced the bug
- Check related files that interact with the broken component
- Trace the data flow: component → state → API calls → response

**Tools:**
- `grep` or search (Ctrl+F) in editor to find similar patterns
- Git diff to see what changed recently
- Component dependency tree (imports and exports)

### Step 3: **Validate with Tests**
- Use Playwright to automate reproduction and validation
- Create a test spec file in `tests/` folder that reproduces the issue
- Run tests to confirm the bug exists: `npx playwright test`
- Test results and screenshots go in `debug/` folder
- Validate fixes after making changes

**Test File Template:**
```typescript
import { test, expect } from '@playwright/test';

test('describe the bug', async ({ page }) => {
  await page.goto('http://localhost:8080/path');
  // Reproduce steps
  await page.click('button');
  // Verify bug
  const content = await page.content();
  expect(content).toContain('expected text');
});
```

**Test Commands:**
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/debug-browse.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Run with headed browser (see what happens)
npx playwright test --headed
```

### Step 4: **Research on the Internet**
- Search for error messages or unexpected behavior
- Look for similar issues in related libraries/frameworks
- Check GitHub issues in relevant repositories
- Review documentation for the technology involved

**Common Search Patterns:**
- React hooks violation (check React rules of hooks)
- Component rendering blank (check conditional hooks, early returns)
- State not updating (check useState dependency arrays, closures)
- TypeScript errors (check type definitions and interfaces)

### Step 5: **Debug the Code**
- Add console.log statements to trace data flow
- Use React DevTools browser extension to inspect component state
- Check for common issues:
  - **React Rules of Hooks**: Hooks must always be called in same order, never conditionally
  - **Timezone Issues**: Date handling across local/UTC conversions
  - **Race Conditions**: Multiple requests for same resource, state consistency
  - **Missing Dependencies**: Array items in useEffect, useMemo, useCallback deps
  - **Type Mismatches**: Unexpected data structures from API

### Step 6: **Repeat Until Fixed**
- Make a small, targeted fix
- Re-run Playwright tests to validate
- Check browser DevTools for errors/warnings
- If still broken, go back to Step 2 and dig deeper
- Once fixed, verify test still passes

---

## Project-Specific Testing Tips

### Current Test Setup
- **Framework**: Playwright
- **Test Location**: `tests/` folder
- **Artifacts**: Screenshots and results in `debug/` folder
- **Running tests**: `npx playwright test`

### Common Issues Fixed in This Project

#### Issue: Blank Provider Detail Page
**Root Cause**: React hooks violation - conditional hook calls
**Fix**: Extract detail view into separate component so hooks always render
**Validation**: Playwright test checks for non-zero HTML content and specific elements

#### Issue: Multi-Date Opening Creation (4+ days)
**Root Cause**: `for (let d = date; d.setDate(...))` breaks because setDate() returns timestamp
**Fix**: Use `while` loop with separate increment outside the condition
**Validation**: Create opening with 4 days, verify all 4 slots created in Supabase

#### Issue: May/June Openings Not Visible
**Root Cause**: Calendar month comparison used wrong variable
**Fix**: Compare against `calendarMonth.getMonth()` not `calendarDateRange.start.getMonth()`
**Validation**: Navigate calendar to May/June, verify dates are selectable

---

## Debugging Commands Reference

```bash
# Start dev server
npm run dev

# Run tests once
npx playwright test

# Run tests in watch mode (re-run on changes)
npx playwright test --watch

# Run with debug UI (step through tests)
npx playwright test --debug

# Run headed (see browser window)
npx playwright test --headed

# Run specific test file
npx playwright test tests/debug-browse.spec.ts

# View test report
npx playwright show-report

# Check for linting issues
npm run lint

# Check TypeScript compilation
npm run build
```

## File Organization

```
/
├── tests/                      # All spec files (.spec.ts)
│   └── debug-browse.spec.ts   # Browse list/detail validation
├── debug/                      # Test results and artifacts
│   ├── test-results/          # Playwright test reports
│   └── *.png                  # Screenshots from tests
├── src/
│   ├── components/            # React components (where bugs usually are)
│   └── ...
└── docs/
    └── DEBUGGING_PROCESS.md   # This file
```

## Workflow Example: Fixing a Blank Page Issue

1. **Reproduce**: Navigate to `/browse/:id`, page shows blank
2. **Browse**: Check `BrowseDetail.tsx` component, trace data loading
3. **Validate**: Create test that checks for non-zero HTML and specific elements
4. **Research**: Search "React hooks violation blank page" → find that early returns break hooks
5. **Debug**: Add console.log before hooks, check if they're being called
6. **Fix**: Move conditional logic outside component or split into separate component
7. **Test**: Run Playwright test, verify elements now visible
8. **Iterate**: If still broken, check error logs and repeat from Step 2

---

## Tips for Effective Debugging

✅ **Do:**
- Start with the simplest possible reproduction
- Use Playwright to automate and verify fixes
- Check browser console for error messages
- Test one small change at a time
- Document what you learn for future reference

❌ **Don't:**
- Change multiple things and hope one works
- Ignore error messages in console
- Assume you know the cause without checking
- Skip validation with tests
- Work in the dark - use DevTools

---

**Remember**: If something is broken, there's always a reason. Follow the cycle, be systematic, and the fix will reveal itself. Happy debugging! 🚀

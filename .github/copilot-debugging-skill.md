# Copilot Debugging Skill - Quick Reference

**USE THIS SKILL WHEN**: A user reports a bug or issue (blank page, broken feature, UI not working, etc.)

**INVOCATION**: Include this in your system prompt or reference with `/debug`

---

## 6-STEP DEBUGGING CYCLE

### 1️⃣ REPRODUCE
```bash
npm run dev
# Navigate to exact URL, follow exact steps to trigger bug
# Open DevTools (F12) → Console tab → check for errors
```

### 2️⃣ BROWSE CODE
- Find relevant component file(s) involved
- Check recent git commits (git log -n 5)
- Trace: component → state → API → response
- Look for common issues:
  - ❌ Conditional hooks / early returns before hooks
  - ❌ Missing useEffect dependencies
  - ❌ Stale state closures
  - ❌ Type mismatches from API

### 3️⃣ VALIDATE WITH PLAYWRIGHT
```bash
# Create or update test in tests/
# Run: npm run test tests/[filename]
# Results saved to debug/ folder with screenshots
```

**Test template:**
```typescript
test('describe bug', async ({ page }) => {
  await page.goto('http://localhost:8080/path');
  // Reproduce steps
  await page.click('[selector]');
  // Verify bug or expected behavior
  const content = await page.content();
  expect(content).toContain('text');
});
```

### 4️⃣ RESEARCH
- Search: "[error message] React" 
- Check: React docs, GitHub issues, StackOverflow
- Common sources:
  - facebook/react (hooks, state, rendering)
  - supabase/supabase-js (API issues)
  - microsoft/playwright (test issues)

### 5️⃣ DEBUG & FIX
```bash
# Add console.log to trace execution
# Use browser DevTools: F12 → Console, Network, React DevTools extension
# Make ONE small fix at a time
```

**Fix strategy:**
- Hooks issue? → Split into separate component
- Stale state? → Add missing dependency
- API issue? → Add error handling, type guard
- Date issue? → Parse manually, don't use toISOString()

### 6️⃣ REPEAT & VALIDATE
```bash
npm run test                    # ✅ Test passes?
npm run test:headed            # ✅ See browser rendering?
npm run test:report            # ✅ View detailed report?
# Manual test in browser       # ✅ Feature works?
# Check console                # ✅ No errors?
```

---

## COMMON FIXES IN THIS PROJECT

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| **Blank page on navigation** | React hooks violation | Extract into separate component, move conditional before hooks |
| **Multi-day selection fails** | `d.setDate()` returns timestamp, breaks loop | Use `while` loop with separate increment |
| **Future dates disabled** | Wrong variable in month comparison | Compare against `calendarMonth`, not old `dateRange` |
| **Double booking possible** | No atomic booking operation | Mark opening unavailable in same transaction as appointment creation |

---

## TOOLS & COMMANDS

```bash
# Testing
npm run test                    # Run all tests
npm run test:ui               # Interactive UI (best for debugging!)
npm run test:headed           # See browser while tests run
npm run test:debug            # Step through with debugger
npm run test:report           # View HTML test report

# Development
npm run dev                    # Start dev server
npm run lint                   # Check for linting issues
npm run build                  # Build for production

# Debugging
F12                           # Open browser DevTools
React DevTools extension      # Inspect component state
Network tab                   # See API calls and responses
```

---

## PRO TIPS 🚀

✅ **DO:**
- Check browser console FIRST (errors are golden)
- Use `npm run test:ui` for interactive test debugging
- Create minimal test - test 1 thing, not 5
- Check screenshots in debug/ folder
- Search "[error message] React" when stuck
- Take notes on what you know vs. don't know

❌ **DON'T:**
- Change multiple things hoping one works
- Ignore console errors
- Skip Playwright validation
- Assume you know the cause without checking
- Test in production - always use localhost:8080

---

## DEBUGGING HISTORY

✅ **React Hooks Violation**: Fixed blank Browse detail page by extracting into separate component
✅ **Multi-Date Creation**: Fixed 4-day opening only creating 2 slots by using proper while loop
✅ **Calendar Dates**: Fixed disabled future dates by comparing against correct month variable
✅ **Booking Race Condition**: Fixed double-booking by marking opening unavailable atomically

See `docs/COPILOT_SKILLS.md` for detailed history and patterns.

---

**Next Time You Debug:**
1. Reference this skill with: "Follow the 6-step debugging cycle from .copilot-debugging-skill.md"
2. Or use: "Use Playwright to validate, research on internet, then debug and repeat"
3. Or just: "Use the systematic debugging approach we documented"

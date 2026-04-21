DEBUG SKILL: ESTABLISHED AND READY
═════════════════════════════════════════════════════════════════════════════

WHAT IS THE DEBUG SKILL?
─────────────────────────────────────────────────────────────────────────────
A systematic 8-phase debugging process that loops until problems are solved.

When you ask to "use debug skill" or tell me to "debug this", I will follow 
this structured approach instead of random guessing.

THE 8 PHASES
─────────────────────────────────────────────────────────────────────────────

1. UNDERSTAND THE PROBLEM
   - What is the user experiencing?
   - Where does it happen?
   - What should happen vs what actually happens?
   - Is it consistent or intermittent?

2. GATHER EVIDENCE
   - Browser console (F12) - check for errors
   - Network tab - see API requests and responses
   - Application tab - check auth tokens, storage
   - Code investigation - grep, git log, git diff
   - Database queries - test data directly

3. FORM HYPOTHESIS
   List possible causes (most to least likely):
   - Data/Query Issue (45% - most common)
   - Initialization Order (20%)
   - Authorization/Permissions (15%)
   - Conditional Logic (10%)
   - Type Mismatch (5%)
   - Other (5%)

4. TEST HYPOTHESIS
   - Add console logs to isolate problem
   - Print actual vs expected values
   - Check data types
   - Narrow down where it breaks
   - Create minimal reproduction case

5. VERIFY ROOT CAUSE
   - Can you reproduce the issue consistently?
   - Does it only happen with certain data?
   - Can you trace through the entire flow?
   - Is this the actual root cause or a symptom?

6. IMPLEMENT FIX
   - Make minimal, surgical changes
   - Don't fix unrelated issues
   - Update related functions if needed
   - Add comments explaining the fix

7. VALIDATE FIX
   - Code validation (npm run lint)
   - Manual testing (test broken scenario)
   - Test related features (nothing else broke)
   - Test edge cases (empty, null, etc)
   - Browser testing (no new errors)

8. LOOP UNTIL SOLVED
   - Still broken? → Go back to Phase 2 with new info
   - Problem solved?
     - Update .github/ with findings
     - Document the fix
     - Commit with detailed message

DOCUMENTATION SAVED
─────────────────────────────────────────────────────────────────────────────
✓ .github/DEBUG_SKILL.md
  Complete systematic debugging guide with:
  - All 8 phases detailed
  - Common debugging patterns
  - Tools to use (DevTools, grep, git, database)
  - Success criteria
  - Example debugging session

✓ .github/DEBUG_SKILL_QUICK_REF.txt
  One-page quick reference card with:
  - Phase checklist
  - Common patterns to check
  - Tools reference
  - Success criteria
  - Most common root causes by percentage

COMMON DEBUGGING PATTERNS RECOGNIZED
─────────────────────────────────────────────────────────────────────────────
✓ Empty Array / No Results
  - Check: Is data being fetched?
  - Check: Is filter too strict?
  - Check: Are null values being removed?

✓ Null Pointer Exception
  - Check: Is variable defined?
  - Check: Is it assigned a value?
  - Check: Does property exist?
  - Check: Are you checking for null?

✓ Wrong Data Displayed
  - Check: Is correct data being queried?
  - Check: Is correct data being filtered?
  - Check: Is cache showing old data?

✓ Authorization Denied
  - Check: Is user authenticated?
  - Check: Is user authorized?
  - Check: Is RLS policy correct?

✓ Infinite Loop / Performance
  - Check: Is useEffect dependency array correct?
  - Check: Is state being updated in render?

TOOLS AVAILABLE
─────────────────────────────────────────────────────────────────────────────
Browser DevTools:
  - Console: errors, logs, commands
  - Network: HTTP requests and responses
  - Application: storage, cookies, cache
  - Sources: breakpoints, step through code

Code Search:
  grep -n "searchTerm" src/components/File.tsx
  grep -r "searchTerm" src/

Git:
  git log --oneline -10
  git diff HEAD~1 src/file.tsx
  git blame src/file.tsx

Database:
  const { data, error } = await supabase
    .from('table').select('*').eq('condition', 'value');

React DevTools:
  - Inspect component props
  - Watch state changes
  - Check render counts

HOW TO USE DEBUG SKILL
─────────────────────────────────────────────────────────────────────────────
Just ask:
  "use debug skill"
  "debug the issue where..."
  "something's broken, debug it"
  "apply debug skill to this problem"
  "debug this for me"

Then I will:
1. Ask clarifying questions (Phase 1)
2. Gather evidence systematically (Phase 2)
3. Form hypotheses (Phase 3)
4. Test them (Phase 4)
5. Verify root cause (Phase 5)
6. Implement fix (Phase 6)
7. Validate thoroughly (Phase 7)
8. Keep looping until solved (Phase 8)

SUCCESS CRITERIA
─────────────────────────────────────────────────────────────────────────────
Problem is solved when:
✅ Root cause is identified and documented
✅ Fix is implemented and tested
✅ No new errors in console
✅ Related features still work
✅ Edge cases are handled
✅ Solution is minimal and surgical

COMMITS
─────────────────────────────────────────────────────────────────────────────
6dde843: docs: Add DEBUG SKILL - systematic debugging process
a4f3595: docs: Add DEBUG SKILL quick reference card

═════════════════════════════════════════════════════════════════════════════
STATUS: DEBUG SKILL IS NOW AVAILABLE AND DOCUMENTED
Ready to debug any issue systematically and find root causes!
═════════════════════════════════════════════════════════════════════════════

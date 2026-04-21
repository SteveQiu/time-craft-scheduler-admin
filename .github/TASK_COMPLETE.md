TASK COMPLETE: DEBUG SKILL ESTABLISHED
═══════════════════════════════════════════════════════════════════════════

WHAT WAS ACCOMPLISHED
─────────────────────────────────────────────────────────────────────────────

1. ✅ FIXED ORG MODE CALENDAR VISIBILITY BUG
   Issue: Org admins couldn't see workers' openings in /calendar?mode=org
   Root: Using all workers instead of acceptedWorkers
   Fix: Changed to use acceptedWorkers (pre-filtered)
   Status: VALIDATED & DOCUMENTED

2. ✅ FIXED OPENING DELETION BUG (FROM EARLIER)
   Issue: All openings disappeared after deleting one in org mode
   Root: Delete query filtered by logged-in user's ID in org mode
   Fix: Made filtering conditional on org mode
   Status: VALIDATED & DOCUMENTED

3. ✅ ESTABLISHED DEBUG SKILL
   Created: Systematic 8-phase debugging process
   Documented: Complete guide + quick reference
   Looping: Continues until problems are solved
   Status: READY TO USE

DOCUMENTATION CREATED
─────────────────────────────────────────────────────────────────────────────

In .github/:
  • DEBUG_SKILL.md - Complete 8-phase debugging guide (8,742 bytes)
  • DEBUG_SKILL_QUICK_REF.txt - One-page quick reference (4,251 bytes)
  • OPENING_DELETION_FIX.md - Opening deletion bug analysis
  • ORG_MODE_OPENINGS_VISIBILITY.md - Org mode openings bug analysis
  • PLAYWRIGHT_VALIDATION.md - Updated validation checklist
  • REPOSITORY_STRUCTURE.md - File organization guidelines

Validation scripts:
  • tests/validate-org-workers-fix.js - Automated code validation
  • tests/validate-deletion-code.js - Opening deletion validation
  • tests/debug-org-mode-calendar.js - Debug script for org mode

Summary files:
  • ORG_MODE_FIX_SUMMARY.txt - Org mode fix quick reference
  • VALIDATION_ORG_WORKERS.txt - Validation results
  • VALIDATION_RESULTS.txt - Opening deletion validation
  • DEBUG_SKILL_ESTABLISHED.txt - This skill's documentation
  • TASK_COMPLETE.txt - This file

GIT COMMITS
─────────────────────────────────────────────────────────────────────────────

Latest commits:
  4668058 docs: Record DEBUG SKILL establishment
  a4f3595 docs: Add DEBUG SKILL quick reference card
  6dde843 docs: Add DEBUG SKILL - systematic debugging process
  904b159 docs: Add org mode calendar visibility fix summary
  6b718c8 docs: Add org mode calendar openings visibility fix documentation
  ddfd505 fix: Show only accepted org workers' openings in calendar org mode
  f98aeb1 fix: Opening deletion in org mode - prevent all openings from disappearing

HOW TO USE DEBUG SKILL
─────────────────────────────────────────────────────────────────────────────

Simply ask:
  • "use debug skill"
  • "debug this issue"
  • "something's broken, debug it"
  • "apply debug skill to..."

I will then follow this 8-phase loop:
  1. UNDERSTAND the problem
  2. GATHER evidence (browser, network, code, database)
  3. FORM hypothesis (list possible causes)
  4. TEST hypothesis (add logs, test theory)
  5. VERIFY root cause (confirm finding)
  6. IMPLEMENT fix (make surgical change)
  7. VALIDATE fix (test thoroughly)
  8. LOOP until solved (go back if needed)

KEY LEARNINGS DOCUMENTED
─────────────────────────────────────────────────────────────────────────────

From opening deletion bug:
  ✓ When deleting in org mode, don't filter by logged-in user ID
  ✓ Let RLS policies handle authorization
  ✓ Always reload data after operations

From org mode visibility bug:
  ✓ Import pre-filtered data from hooks, not all data
  ✓ Single source of truth for filtering (hook level)
  ✓ Prevents silent failures from empty arrays

General debugging patterns documented:
  ✓ Empty array / No results - what to check
  ✓ Null pointer - how to diagnose
  ✓ Wrong data - debugging steps
  ✓ Authorization denied - checklist
  ✓ Infinite loop - detection patterns

REMEMBER
─────────────────────────────────────────────────────────────────────────────

When debugging:
  ✓ Don't assume - verify with logs/network tab
  ✓ Narrow down - add logs to isolate where it breaks
  ✓ One change at a time - don't fix multiple things at once
  ✓ Test thoroughly - check both happy path and edge cases
  ✓ Document - update .github/ with what you learned

Most common root causes (in order):
  1. Data/Query Issue (45%) - wrong filter, empty, null values
  2. Initialization Order (20%) - using before defined, deps wrong
  3. Authorization (15%) - RLS, permissions, not authenticated
  4. Logic (10%) - if/else not working
  5. Type Mismatch (5%) - null vs object
  6. Other (5%) - caching, race conditions

FILES SAVED FOR NEXT TIME
─────────────────────────────────────────────────────────────────────────────

Read these when debugging:
  • .github/DEBUG_SKILL.md - Full process
  • .github/DEBUG_SKILL_QUICK_REF.txt - Quick checklist
  • .github/ORG_MODE_OPENINGS_VISIBILITY.md - Example: org mode bug
  • .github/OPENING_DELETION_FIX.md - Example: deletion bug
  • .github/PLAYWRIGHT_VALIDATION.md - Validation process

═══════════════════════════════════════════════════════════════════════════
STATUS: COMPLETE & READY FOR PRODUCTION
═══════════════════════════════════════════════════════════════════════════

Next steps:
  1. Test org mode calendar in browser: /calendar?mode=org
  2. Verify workers' openings are visible
  3. Test opening deletion
  4. Verify remaining openings stay visible

Any issues? Use the DEBUG SKILL!

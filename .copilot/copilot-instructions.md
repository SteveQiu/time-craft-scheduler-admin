# Copilot Instructions for Time Craft Scheduler Admin

## Role Definition
**You are a Project Manager for this repository.** Your primary responsibilities are:
- Managing code changes and features systematically
- Maintaining code organization and cleanliness
- Ensuring comprehensive testing and validation
- Keeping documentation up-to-date
- Managing technical debt and cleanup tasks

## Startup Checklist
Every session, you should:

1. **Read this file** - Understand the current project state and guidelines
2. **Check session context** - Review any checkpoints or prior work
3. **Assess current state** - What was done? What needs continuation?
4. **Set clear intent** - What is the user asking for?
5. **Execute with discipline** - Follow the development patterns below

---

## Development Patterns

### Code Changes
- ✅ Make **surgical, targeted changes** - only modify what's needed
- ✅ Update **all affected code paths** - don't leave inconsistencies
- ✅ **Validate with tests** - run build and tests after changes
- ✅ **Document changes** - update related documentation
- ✅ **Commit with context** - clear commit messages with technical details

### File Organization
- 📁 **Root folder**: Only markdown files for documentation, package.json, config files
- 📁 **src/**: React components and TypeScript source code
- 📁 **.github/**: Strategic documentation (DEBUG_SKILL.md, deployment guides, etc.)
- 📁 **tests/**: Playwright E2E tests and test suites
- ⚠️ **Root test files**: Should be moved to tests/ folder or .github/

### Documentation Strategy
- 📝 **Bug fixes**: Create comprehensive fix documentation in .github/ or root
- 📝 **Features**: Document in .github/ with problem/solution/testing sections
- 📝 **Session work**: Create checkpoint summaries
- 📝 **Code patterns**: Document patterns discovered during development

### Testing Requirements
- 🧪 **Every feature**: Create Playwright tests in tests/ folder
- 🧪 **Every bug fix**: Validate fix is working with tests
- 🧪 **Build validation**: Always run `npm run build` before committing
- 🧪 **No regressions**: Check existing tests still pass

### Commit Strategy
- 📌 Clear commit messages with technical details
- 📌 Reference files and line numbers where relevant
- 📌 Include test results summary
- 📌 Always include Co-authored-by trailer:
  ```
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  ```

---

## Automatic Cleanup System

### How It Works
- Every **5 user prompts**, a cleanup subagent is automatically spawned
- The subagent's job: **Organize repository** to match this structure

### Cleanup Tasks (Every 5 Prompts)
1. **Move test files from root to tests/**
   - Pattern: `*.spec.ts`, `*-test.ts`, `*-validation.ts`
   - Except: Files explicitly needed at root

2. **Move AI/debug docs from root to .github/**
   - Pattern: `DEBUG_*.md`, `*_INSTRUCTIONS.md`, `VALIDATION_*.md`
   - Except: Primary documentation (README.md, copilot-instructions.md)
   - Update all references in .github/README.md

3. **Update references in documentation**
   - Find all markdown files mentioning moved files
   - Update paths from root to new locations
   - Verify links still work

4. **Clean up artifacts**
   - Remove old debug screenshots/outputs
   - Archive completed work to checkpoints/
   - Keep repo clean and navigable

### Example Cleanup
```
Before:
  DEBUG_SESSION_CIRCLE_SPINNING.md         → MOVE to .github/
  validate-fixes.spec.ts                   → MOVE to tests/
  VALIDATION_RESULTS.txt                   → MOVE to .github/

After:
  .github/DEBUG_SESSION_CIRCLE_SPINNING.md ✓
  tests/validate-fixes.spec.ts             ✓
  .github/VALIDATION_RESULTS.txt           ✓
```

---

## Key Guidelines

### When Making Changes
1. **Understand the problem** - Debug before coding
2. **Find the root cause** - Don't patch symptoms
3. **Check all code paths** - Update everywhere the code appears
4. **Validate thoroughly** - Test all scenarios
5. **Document clearly** - Future you will thank you

### When Debugging
1. **Use DEBUG SKILL** - See [.github/DEBUG_SKILL.md](.github/DEBUG_SKILL.md)
2. **Follow 7-phase process** - Understand → Hypothesize → Test → Fix
3. **Create tests** - Validate fix, prevent regressions
4. **Document findings** - Record what you learned in .github/

### When Organizing Code
1. **One concern per file** - Keep components focused
2. **DRY principle** - Extract duplicate logic
3. **Clear naming** - Function/variable names should be self-documenting
4. **Type safety** - Use TypeScript interfaces properly
5. **Error handling** - Always handle failures gracefully

---

## Repository Structure Reference

```
time-craft-scheduler-admin/
├── .github/
│   ├── INDEX.md                           (Documentation index)
│   ├── DEBUG_SKILL.md                     (Debugging process)
│   ├── ORG_MODE_OPENING_RLS_FIX.md        (RLS fix documentation)
│   ├── ORG_MODE_OPENINGS_VISIBILITY_FIX.md (Org openings fix)
│   └── ... (strategic docs - see INDEX.md)
│
├── src/
│   ├── components/                        (React components)
│   ├── hooks/                             (Custom React hooks)
│   ├── integrations/                      (API integrations)
│   └── ... (source code)
│
├── tests/
│   ├── *.spec.ts                          (Playwright tests)
│   └── ... (test files)
│
├── public/                                (Static assets)
├── dist/                                  (Build output)
├── node_modules/                          (Dependencies)
│
├── package.json                           (Project config)
├── tsconfig.json                          (TypeScript config)
├── vite.config.ts                         (Build config)
├── copilot-instructions.md                (This file)
└── README.md                              (Project overview)
```

---

## Session Tracking

- **Checkpoint system**: Major milestones saved to `session-state/checkpoints/`
- **Prompt counter**: Auto-incremented after each user prompt
- **Cleanup schedule**: Every 5 prompts → spawn cleanup subagent
- **Progress notes**: Document what was accomplished

---

## Quick Reference

| Task | What to Do |
|------|-----------|
| **Adding feature** | Create test first, implement, validate, document |
| **Fixing bug** | Debug systematically, create test, fix, validate |
| **Refactoring** | Ensure no behavior change, add tests if missing, document |
| **Moving file** | Update all imports, run build, commit with references |
| **Adding doc** | Save to .github/, link from README.md |
| **Cleanup needed** | Wait for automatic cleanup agent (every 5 prompts) |

---

## Contact & Escalation

- 🤔 **Unclear requirements**: Ask for clarification
- 🐛 **Unexpected issue**: Debug using DEBUG SKILL phases
- ⚠️ **Major decision**: Propose options to user
- 📊 **Metrics needed**: Check current implementation and benchmark

---

## Last Updated
Session: 2026-04-21

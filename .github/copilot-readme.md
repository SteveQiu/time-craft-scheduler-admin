# Copilot Skills & Instructions Reference

**Welcome!** This is your friendly index to all Copilot documentation for this project. Start here to find what you need.

This guide helps you quickly reference the debugging methodology and skills built from this project's history.

## 🚀 Quick Start

**First time?** Read in this order:
1. `.github/copilot-instructions.md` - Master instruction file (project overview, core principles, all 5 skills)
2. `.github/copilot-debugging-skill.md` - Quick reference card (6-step cycle, tips, commands)
3. `docs/COPILOT_SKILLS.md` - Detailed reference and history

**Debugging a bug?** Go straight to:
- `.github/copilot-debugging-skill.md` - Quick reference card
- Follow the 6-step cycle: REPRODUCE → BROWSE → VALIDATE → RESEARCH → DEBUG → REPEAT

---

## 📚 Documentation Map

### `.github/copilot-instructions.md` (Main File)
**Purpose**: Master instruction file with project overview, core principles, and all skills at a glance
**Use when**: Starting a new session or need quick context
**Key sections**:
- Project overview (tech stack, dev server)
- Core principles (5 rules)
- All 5 key skills with examples
- File organization
- Common issues & fixes
- Development workflow
- Debugging history

### `.github/copilot-debugging-skill.md` (Quick Ref)
**Purpose**: Quick reference card for the 6-step debugging cycle
**Use when**: Tackling a bug or issue
**Key sections**:
- 6-step cycle (reproducible, easy to follow)
- Common fixes table (copy/paste solutions)
- Tools & commands (all shortcuts)
- Pro tips (dos and don'ts)
- Project debugging history

### `docs/COPILOT_SKILLS.md` (Detailed)
**Purpose**: Comprehensive documentation with detailed examples and history
**Use when**: Need deep understanding or adding new skills
**Key sections**:
- Full debugging prompt/methodology
- How to use the skill
- Common issues from past sessions with workflows
- How to add new skills for future use
- Detailed examples with code

### `docs/DEBUGGING_PROCESS.md` (Methodology)
**Purpose**: Step-by-step guide explaining the debugging philosophy
**Use when**: Want to understand WHY we debug this way
**Key sections**:
- The debug cycle explanation
- Project-specific testing tips
- Debugging commands reference
- File organization
- Workflow example: fixing a blank page

---

## 🎯 The 6-Step Debugging Cycle

This is the core skill captured from this project's debugging history:

```
1. REPRODUCE  → Use exact steps, check console for errors
                npm run dev, navigate to URL

2. BROWSE     → Find relevant code, trace data flow
                Check git log, look for patterns

3. VALIDATE   → Create Playwright test to confirm bug
                npm run test tests/[filename]

4. RESEARCH   → Search internet for root cause
                GitHub issues, React docs, StackOverflow

5. DEBUG      → Make one small fix, add console.log
                Use browser DevTools, find the issue

6. REPEAT     → Test again, check console
                If broken, go back to step 2
```

**Exit criteria**: ✅ Test passes ✅ Console clean ✅ Manual test works

---

## 🎓 Skills Documented

### Skill 1: Systematic Debugging ⭐ MOST IMPORTANT
The 6-step cycle above. Use for ANY bug or issue.
- Reference: `.copilot-debugging-skill.md` (quick) or `docs/COPILOT_SKILLS.md` (detailed)

### Skill 2: React Hooks Debugging
When to split components to avoid hooks violations
- Common pattern: Detail view causes blank page
- Fix: Extract into separate component so hooks always run

### Skill 3: Date & Timezone Handling
JavaScript dates across timezones
- ❌ Don't: `new Date("2026-05-01")` (uses UTC)
- ✅ Do: `new Date(2026, 4, 1)` (local timezone)

### Skill 4: Component Splitting
When a component has different hook counts, split it
- One component = one set of hooks
- If hooks vary based on conditions, extract

### Skill 5: Testing with Playwright
Validate fixes with automated tests
- Commands: `npm run test`, `npm run test:ui`, `npm run test:headed`
- Tests go in: `tests/` folder
- Results: `debug/` folder with screenshots

---

## 📋 When to Use Each File

| Scenario | Read This | Then... |
|----------|-----------|--------|
| **New session starting** | `.github/copilot-instructions.md` | Refresh context |
| **Bug reported** | `.github/copilot-debugging-skill.md` | Follow 6-step cycle |
| **Need detailed reference** | `docs/COPILOT_SKILLS.md` | Deep dive into skill |
| **Want to understand why** | `docs/DEBUGGING_PROCESS.md` | Learn methodology |
| **Stuck on something** | `.github/copilot-debugging-skill.md` → Pro Tips | Check dos/don'ts |
| **Adding new skill** | `docs/COPILOT_SKILLS.md` | See "Adding New Skills" |

---

## 🔧 Development Commands

```bash
# Start
npm run dev                    # Dev server at http://localhost:8080

# Test & Debug
npm run test                   # Run all tests
npm run test:ui              # Interactive UI (best for debugging!)
npm run test:headed          # See browser while tests run
npm run test:debug           # Step through with debugger
npm run test:report          # View HTML report

# Quality
npm run lint                 # Check linting
npm run build                # Build for production

# Browser DevTools
F12                          # Open DevTools
```

---

## 💡 Pro Tips

✅ **DO:**
- Read `.copilot-instructions.md` at start of session
- Use `.copilot-debugging-skill.md` for bugs
- Create Playwright test BEFORE fixing
- Check browser console FIRST
- Make one small change at a time
- Search "[error] React" when stuck

❌ **DON'T:**
- Change multiple things without testing each
- Ignore console errors
- Skip Playwright validation
- Assume cause without investigating
- Work in production instead of localhost:8080

---

## 📊 Debugging History from This Project

This is why the skills exist - these bugs were debugged and documented:

1. **React Hooks Violation** (Browse list → detail blank)
   - Cause: Early returns before hooks
   - Fix: Extract detail view to separate component
   - Skill: "React Hooks Debugging"

2. **Multi-Date Creation** (4 days only creates 2)
   - Cause: `for (d.setDate(...))` returns timestamp
   - Fix: Use `while` loop with separate increment
   - Skill: "Careful with loop patterns"

3. **Calendar Dates Disabled** (May/June not selectable)
   - Cause: Wrong month variable in comparison
   - Fix: Compare against `calendarMonth`, not `dateRange`
   - Skill: "Date comparison debugging"

4. **Booking Race Condition** (Double booking possible)
   - Cause: No atomic transaction
   - Fix: Mark opening unavailable in same DB operation
   - Skill: "Atomic operations matter"

See `docs/COPILOT_SKILLS.md` for full details on each.

---

## 🚀 Ready to Start?

1. **New session?** → Read `.github/copilot-instructions.md`
2. **Got a bug?** → Use `.github/copilot-debugging-skill.md`
3. **Need deep reference?** → Check `docs/COPILOT_SKILLS.md`
4. **Want to learn?** → Read `docs/DEBUGGING_PROCESS.md`

The skills are designed to be quick-reference but comprehensive. Start with the quick refs and dig deeper only when needed.

---

**Last Updated**: 2026-04-15
**Version**: 1.0
**Status**: Ready to use!

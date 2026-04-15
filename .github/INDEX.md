# .github Knowledge Base Index

**Your Copilot's brain!** This folder contains everything needed to understand, develop, and debug this project.

---

## 🎯 Quick Navigation

### I need to...

**🐛 Fix a bug**
1. Start: `.github/copilot-debugging-skill.md` (6-step cycle)
2. Check: `.github/TROUBLESHOOTING.md` (common issues)
3. Deep dive: `.github/ARCHITECTURE.md` (design patterns)
4. Debug: `.github/DEBUGGING_INFRASTRUCTURE.md` (see network/console/errors)

**🏗️ Understand the project**
1. Start: `.github/copilot-readme.md` (friendly intro)
2. Deep dive: `.github/ARCHITECTURE.md` (tech stack + design)
3. Reference: `.github/API_REFERENCE.md` (code patterns)

**💾 Work with the database**
1. Reference: `.github/DATABASE.md` (schema + queries)
2. RLS issues: `.github/TROUBLESHOOTING.md` (debugging)

**🔌 Use an API/hook**
1. Reference: `.github/API_REFERENCE.md` (all available APIs)
2. Examples: `.github/ARCHITECTURE.md` (data flow examples)

**🎓 Learn best practices**
1. Read: `.github/copilot-instructions.md` (5 documented skills)
2. Reference: `.github/TROUBLESHOOTING.md` (common pitfalls)

---

## 📚 Complete File Guide

| File | Purpose | When to Read |
|------|---------|--------------|
| **BOOKING_FIX.md** | Step-by-step fix for booking RPC error | 🔴 Booking doesn't work |
| **DEBUGGING_INFRASTRUCTURE.md** | Playwright-based DevTools capture (network, console, errors) | 🔍 Need detailed debugging visibility |
| **copilot-readme.md** | Friendly entry point with links | First time here? Start here |
| **copilot-instructions.md** | Master docs: project overview + 5 skills | Need project context |
| **copilot-debugging-skill.md** | Quick reference: 6-step debugging cycle | Debugging a bug right now |
| **ARCHITECTURE.md** | Design decisions, tech stack, patterns | Understanding how it works |
| **DATABASE.md** | Schema, queries, RPC functions | Working with data |
| **API_REFERENCE.md** | Hooks, Supabase, React Query patterns | Writing code |
| **TROUBLESHOOTING.md** | Common issues and fixes | Something isn't working |
| **INDEX.md** (this file) | Navigation guide | Finding what you need |

---

## 🧠 What's Stored Here (Knowledge Base)

### Architecture & Design
- **Tech Stack**: React 18, TypeScript, Vite, Supabase
- **Component Patterns**: BrowseList + BrowseDetail split (hooks rule compliance)
- **Data Patterns**: Atomic transactions for bookings, timezone-safe dates
- **Performance**: Query optimization, React Query caching

### Debugging History
- **React Hooks Violation** - Extract into separate component
- **Multi-Date Creation** - Use while loop, not for loop
- **Calendar Dates Disabled** - Wrong month comparison variable
- **Race Conditions** - Mark opening unavailable atomically

### Common Problems & Solutions
- 15+ common issues with fixes
- Debugging strategies for each issue type
- Links to relevant code and documentation

### API & Integration Reference
- Supabase operations (select, insert, update, RPC)
- React Query patterns (useQuery, useMutation)
- Custom hooks (useAuth, useUserRoles, useToast)
- React Router setup
- Error handling patterns

### Database Reference
- Schema for 6 tables
- RPC functions (book_opening, create_opening)
- Common queries
- Row-level security (RLS) explained
- Performance indexes

---

## 🚀 How to Use This in Practice

### Scenario 1: User Reports Blank Page Bug
```
1. Read: copilot-debugging-skill.md → 6-step cycle
2. Reproduce: Follow step 1 (reproduce the issue)
3. Browse: Step 2 (find relevant code in ARCHITECTURE.md)
4. Validate: Step 3 (create Playwright test)
5. Research: Step 4 (check TROUBLESHOOTING.md for blank page issues)
6. Fix: Step 5 (apply fix from TROUBLESHOOTING.md)
7. Test: Step 6 (verify test passes)
```

### Scenario 2: Need to Book an Appointment
```
1. Read: API_REFERENCE.md → book_opening RPC function
2. Understand: DATABASE.md → appointments table schema
3. Learn: ARCHITECTURE.md → data flow example
4. Code: Use RPC with React Query mutation
5. Test: Create Playwright test to validate
```

### Scenario 3: Debugging Performance Issue
```
1. Read: ARCHITECTURE.md → performance considerations
2. Debug: TROUBLESHOOTING.md → performance section
3. Optimize: API_REFERENCE.md → React Query caching patterns
4. Profile: Use browser DevTools Profiler
5. Test: Measure before/after with Playwright
```

---

## 📖 Documentation Hierarchy

```
.github/
├── INDEX.md (you are here)
│   ↓ (start here if lost)
├── copilot-readme.md (friendly intro)
│   ↓ (for first-time users)
├── copilot-instructions.md (master docs)
│   ├─→ ARCHITECTURE.md (design patterns)
│   ├─→ DATABASE.md (schema reference)
│   ├─→ API_REFERENCE.md (code patterns)
│   └─→ TROUBLESHOOTING.md (quick fixes)
│
└── copilot-debugging-skill.md (quick ref card)
    ↓ (when actively debugging)
    └─→ TROUBLESHOOTING.md (common issues)

docs/ (external links from .github/)
├── COPILOT_SKILLS.md (detailed skills + history)
├── DEBUGGING_PROCESS.md (methodology)
└── CODING_STANDARDS.md (style guide)
```

---

## 💡 Tips for Using This Knowledge Base

1. **Bookmark the cycle** - The 6-step cycle is your best friend
   - REPRODUCE → BROWSE → VALIDATE → RESEARCH → DEBUG → REPEAT

2. **Search by symptom** - In TROUBLESHOOTING.md
   - Look for "❌ [Symptom you're seeing]"

3. **Start at the right level**
   - Quick fix? → TROUBLESHOOTING.md
   - Understanding? → ARCHITECTURE.md
   - Code reference? → API_REFERENCE.md

4. **Use cross-references** - Files link to each other
   - Find something? Follow the links for more context

5. **Keep this updated** - As you discover new things
   - Found a bug pattern? Add it to TROUBLESHOOTING.md
   - Found a good pattern? Add it to ARCHITECTURE.md
   - New API? Update API_REFERENCE.md

---

## 📊 Knowledge Base Statistics

**Total Documentation:** 8 files, ~40KB
**Debugging Patterns Documented:** 4 major fixes
**Common Issues Covered:** 15+
**Code Examples:** 50+
**SQL Queries:** 20+
**API Patterns:** 15+

---

## 🔄 How to Update the Knowledge Base

### When you fix a bug
1. Document the issue in TROUBLESHOOTING.md
2. Add the fix steps
3. Include code examples
4. Link to related sections

### When you learn a pattern
1. Add to ARCHITECTURE.md or API_REFERENCE.md
2. Include code examples
3. Cross-reference related sections

### When you discover a limitation
1. Add to ARCHITECTURE.md → "Known Limitations"
2. Suggest future improvement

---

## 🎓 From First Principles

If you're completely new:

1. **Read** `copilot-readme.md` (5 minutes)
   - Get the lay of the land

2. **Skim** `copilot-instructions.md` (10 minutes)
   - Understand project structure

3. **Learn** `ARCHITECTURE.md` (15 minutes)
   - Know design decisions

4. **Reference** `API_REFERENCE.md` + `DATABASE.md` (as needed)
   - When you write code

5. **Bookmark** `copilot-debugging-skill.md`
   - Use when things break

**Total learning time: ~30 minutes**

---

## ⚡ Emergency Quickstart

Something's broken and you need to fix it NOW:

1. **What's wrong?** → Find in TROUBLESHOOTING.md
2. **Not there?** → Start 6-step cycle from copilot-debugging-skill.md
3. **Still stuck?** → Check ARCHITECTURE.md for pattern
4. **Last resort** → Add console.log and use browser DevTools

---

## 🎯 The Philosophy

This knowledge base follows one principle:
> **Keep everything that helps future debugging sessions close by**

So when you (or another Copilot session) encounter an issue:
- You don't have to re-discover the root cause
- You don't have to re-learn the system
- You can focus on fixing, not investigating

---

## 🔗 External Links

**Related documentation in docs/:**
- `docs/COPILOT_SKILLS.md` - Detailed skill documentation
- `docs/DEBUGGING_PROCESS.md` - Debugging philosophy
- `docs/CODING_STANDARDS.md` - Code style guide

**Project tests:**
- `tests/debug-browse.spec.ts` - Example Playwright test
- `debug/` - Test results and screenshots

---

**Last Updated:** 2026-04-15
**Maintained By:** Copilot + User Feedback
**Status:** Living document - grows as you learn

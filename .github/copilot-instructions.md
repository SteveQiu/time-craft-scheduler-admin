# Copilot Instructions for time-craft-scheduler-admin

**Master instruction file for Copilot.** Contains project setup, 5 documented debugging skills, methodology, and learnings from this project's history.

> **New to this project?** Start with `.github/copilot-readme.md` - it's a friendly index that points to all documentation with quick links and explanations of what each file does.

---

## 🚀 Quick Start

**First time?** Read in this order:
1. [Overview](#overview) - Understand the tech stack
2. [Core Principles](#core-principles) - Know the 5 rules
3. [Key Skills](#-key-skills) - Learn the debugging methodology
4. [The 6-Step Debugging Cycle](#-the-6-step-debugging-cycle) - Most important skill

**Debugging a bug?** Go straight to:
- [The 6-Step Debugging Cycle](#-the-6-step-debugging-cycle) - Follow this systematically
- [Common Issues & Fixes](#-common-issues--fixes) - Find similar issues
- [Pro Tips](#-pro-tips) - Quick dos/don'ts

**Quick reference cards** (see `.github/copilot-debugging-skill.md`):
- All 6 steps with commands
- Common fixes table
- Development commands

**See also** `.github/copilot-readme.md` - Index and entry point to all documentation

---

## Overview

This is a React + TypeScript scheduler administration dashboard built with Vite, styled with Tailwind CSS and shadcn-ui components. It integrates with Supabase for authentication and data management.

## Build, Test & Lint

### Development

```bash
npm run dev
# Starts Vite dev server on http://localhost:8080
```

### Production Build

```bash
npm run build
# Creates optimized build in dist/

npm run build:dev
# Creates development build for debugging
```

### Linting

```bash
npm run lint
# ESLint checks all .ts and .tsx files
# Note: @typescript-eslint/no-unused-vars and react-refresh rules are relaxed
```

### Preview

```bash
npm run preview
# Serves the production build locally
```

## Architecture

### Core Stack

- **Vite** (dev server) with React plugin using SWC for fast compilation
- **TypeScript** with lenient config (noImplicitAny, noUnusedLocals disabled) for rapid development
- **React Router v6** for page routing
- **React Query** (@tanstack/react-query) for server state management
- **Supabase** for authentication (Google OAuth) and database operations
- **shadcn-ui** component library (extensive Radix UI primitive components)
- **Tailwind CSS** for styling with animation support

### Directory Structure

- `src/pages/` - Full page components (Auth, Dashboard, Settings, AdminReports, Profile, etc.)
- `src/components/` - Reusable UI components and page modules (AppSidebar, Dashboard, Calendar, Appointments, Workers, etc.)
- `src/components/ui/` - shadcn-ui primitive components (Button, Card, Dialog, Table, etc.)
- `src/hooks/` - Custom React hooks (useAuth, useUserRoles, useOrgWorkers, use-toast, use-mobile)
- `src/integrations/supabase/` - Supabase client and TypeScript types
- `src/lib/` - Utility functions (cn for className merging, etc.)
- `src/data/` - Static data or data constants

### Routing

React Router is configured in App.tsx with the following main routes:

- `/` or `/dashboard` - Main dashboard view
- `/calendar` - Calendar/openings view
- `/browse` - Browse available appointments
- `/workers` - Workers management
- `/appointments` - Appointments list and management
- `/appointments/:id` - Single appointment detail view
- `/openings/:id` - Single opening detail view
- `/auth` - Authentication page
- `/settings` - Settings page
- `/profile` - User profile page
- `/admin/reports` - Admin reports view
- `*` - 404 Not Found page

### Authentication & Authorization

**useAuth Hook:**
- Manages Supabase Auth state (Google OAuth)
- Provides `user`, `session`, `signInWithGoogle`, `signOut`, and `loading` state
- Has development mode bypass for lovable.dev domain (mock user)
- Wraps entire app in App.tsx via AuthProvider

**useUserRoles Hook:**
- Determines user type: `isUser`, `isOrganization`, `isInternalDev`
- Used to conditionally show UI elements in AppSidebar and page components
- Controls view modes ("user" or "org")

**Profile Management:**
- User full_name stored in Supabase `profiles` table
- Fetched and displayed in AppSidebar when available

### Component Patterns

**UI Components:**
- All shadcn-ui components are pre-generated in `src/components/ui/`
- Use the `cn()` utility from `src/lib/utils` to merge Tailwind classes
- Components accept className prop for customization

**Page vs Component:**
- Pages (in `src/pages/`) represent full routes
- Components (in `src/components/`) are modular and reusable
- Dashboard, Calendar, BookingBrowse, Workers, Appointments are full-page modules

**Toast/Notification System:**
- Two toast providers: `Sonner` (modern) and shadcn-ui `Toaster`
- useToast hook available in `src/hooks/use-toast.ts`
- Use Sonner for most notifications (better UX)

### State Management

- **React Query:** For async server state (appointments, workers, openings)
- **React Context:** For global state like auth (useAuth), user roles (useUserRoles)
- **Component State:** Local state with useState for UI (modals, filters, view mode)
- **React Router:** For URL-based state (viewing specific appointments/openings)

## Key Conventions

### Path Aliases

- Use `@/` alias for imports from src directory (configured in vite.config.ts and tsconfig.json)
- Example: `import { Button } from '@/components/ui/button'`

### Component Development Mode

- When running locally or in development mode, Lovable-tagger component tagging is enabled
- This helps with component tracking but doesn't affect functionality

### Tailwind + shadcn-ui

- All components use Tailwind CSS for styling
- Use `cn()` utility to conditionally merge class names
- Follow shadcn-ui patterns for component composition (props drilling, etc.)
- Common utilities: `flex`, `gap`, `px`, `py`, `rounded`, `shadow`, `border`

### TypeScript Configuration

- `strictNullChecks: false` and `noImplicitAny: false` for flexibility
- No strict unused variable checking (helpful during development)
- This is intentional for rapid prototyping in a Lovable project

### Supabase Integration

- Client initialized in `src/integrations/supabase/client.ts`
- TypeScript types generated and stored in `src/integrations/supabase/types.ts`
- Use `supabase` client directly: `supabase.from('table').select().then(...)`
- For Google OAuth redirects, uses `window.location.origin` dynamically
- Auth state changes emit events (SIGNED_IN, SIGNED_OUT, etc.)

### React Query Setup

- QueryClient initialized in App.tsx
- Provides caching and synchronization for server data
- Use with hooks for easier async state management

### View Modes

- AppSidebar supports switching between 'user' and 'org' view modes
- URL params can indicate mode: `/calendar?mode=user` or `/calendar?mode=org`
- Different UI and features shown based on isUser, isOrganization, isInternalDev checks

## Environment Setup

- Node.js required (npm or bun)
- `.env` file should contain Supabase configuration (API URL, Anon Key)
- Dev server runs on `::` (IPv6) on port 8080

## Coding Standards

See `docs/CODING_STANDARDS.md` for comprehensive best practices including:
- File organization and when to split components
- Component structure and naming conventions
- Code quality patterns (time formatting, state management, etc.)
- Performance optimization techniques
- UI/Layout patterns and spacing conventions

## Common Tasks

### Adding a New Page

1. Create component in `src/pages/` or as a module in `src/components/`
2. Add route in `src/App.tsx`
3. Import and link from `src/components/AppSidebar.tsx` if needed

### Creating UI Components

- Use shadcn-ui components from `src/components/ui/`
- Compose them with custom logic
- Example: wrap Button with custom styling or interactivity

### Fetching Data from Supabase

```typescript
import { supabase } from '@/integrations/supabase/client';

// Direct query
const { data, error } = await supabase
  .from('appointments')
  .select('*')
  .eq('user_id', userId);

// With React Query for better UX
const { data, isLoading } = useQuery({
  queryKey: ['appointments', userId],
  queryFn: () => supabase.from('appointments').select('*').eq('user_id', userId),
});
```

### Using Toast Notifications

```typescript
import { useToast } from '@/hooks/use-toast';
// Or use Sonner directly:
import { toast } from 'sonner';

toast.success('Action completed!');
// or
toast.error('Something went wrong');
```

## Deployment

Project is built with Lovable and can be deployed via Lovable's publish feature or as a standard Vite build.

- Build output: `dist/` directory
- Use `npm run build` for production
- Supabase configuration must be set in environment

---

# 🎯 DEBUGGING SKILLS & METHODOLOGY

This section contains the systematic debugging approach developed through this project's history. Use these skills for any bug or feature issue.

## Core Principles

1. **Always use Playwright for validation** - Don't guess if a fix works, test it
2. **Keep fixes small and targeted** - One issue, one change, one test
3. **Check console errors first** - Browser DevTools F12 → Console is your best friend
4. **Follow React Rules of Hooks** - Never call hooks conditionally or in wrong order
5. **Document decisions** - Note why you made changes for future reference

---

## 🎯 Key Skills

### Skill 1: Systematic Debugging ⭐ MOST IMPORTANT

**When to use**: Whenever a bug is reported or a feature isn't working

**The cycle**:
1. REPRODUCE - Use exact steps provided
2. BROWSE - Find relevant code
3. VALIDATE - Create/run Playwright test
4. RESEARCH - Search internet for root cause
5. DEBUG - Fix the issue
6. REPEAT - Test again until it passes

**Exit criteria**: ✅ Test passes ✅ Console clean ✅ Manual test works

**Quick reference**: See the [6-step cycle below](#-the-6-step-debugging-cycle) for detailed instructions.

**Quick reference card**: See `.github/copilot-debugging-skill.md` for a condensed version of this cycle with all commands and common fixes at a glance.

---

### Skill 2: React Hooks Debugging

**Common violation**: Early returns before hooks

```typescript
// ❌ WRONG - returns early, hooks below won't run
function Component({ id }) {
  if (!id) return <div>No ID</div>;  // Early return!
  const [data, setData] = useState(); // This doesn't always run!
  // ...
}

// ✅ RIGHT - move condition outside component
function Parent({ id }) {
  return id ? <ComponentDetail id={id} /> : <div>No ID</div>;
}

function ComponentDetail({ id }) {
  const [data, setData] = useState(); // Always runs
  // ...
}
```

**How to fix**: Extract into separate component so hooks always run

---

### Skill 3: Date & Timezone Handling

**Problem**: JavaScript dates are tricky across timezones

```typescript
// ❌ WRONG - uses UTC
const date = new Date("2026-05-01");

// ✅ RIGHT - local timezone
const date = new Date(2026, 4, 1); // Month is 0-indexed

// ✅ ALSO RIGHT - parse manually
const [year, month, day] = "2026-05-01".split('-').map(Number);
const date = new Date(year, month - 1, day);
```

**Key**: Always use local timezone (getDate, getMonth, getFullYear) not toISOString()

---

### Skill 4: Component Splitting

**Rule**: If a component has conditional logic that causes different hook counts, split it

**Example**: Browse page has list view and detail view with different state/hooks

```typescript
// ❌ WRONG - one component with conditional detail rendering
export function Browse({ providerId }) {
  if (providerId) {
    const [detail, setDetail] = useState();
  }
  const [list, setList] = useState();
  // Different hooks in different renders = violation!
}

// ✅ RIGHT - split into two components
export function Browse({ providerId }) {
  return providerId ? <BrowseDetail id={providerId} /> : <BrowseList />;
}

function BrowseList() {
  const [list, setList] = useState(); // Always called
  // ...
}

function BrowseDetail({ id }) {
  const [detail, setDetail] = useState(); // Always called
  // ...
}
```

---

### Skill 5: Testing with Playwright

**Commands**:
```bash
npm run test              # Run all tests
npm run test:ui          # Interactive UI (great for debugging)
npm run test:headed      # See the browser
npm run test:debug       # Step through tests
npm run test:report      # View HTML report
```

**Test template** (in `tests/` folder):
```typescript
import { test, expect } from '@playwright/test';

test('describe what should work', async ({ page }) => {
  // Setup
  await page.goto('http://localhost:8080/path');
  
  // Action
  await page.click('button');
  await page.fill('input', 'value');
  
  // Assertion
  const content = await page.content();
  expect(content).toContain('expected text');
  
  // Alternatively check for presence of elements
  const element = await page.locator('selector').isVisible();
  expect(element).toBe(true);
});
```

**Tips**:
- Use `npm run test:ui` for interactive debugging (can see browser)
- Playwright saves screenshots automatically to `debug/` folder
- Tests run against `http://localhost:8080` - make sure dev server is running
- Use `await page.waitForURL()` to wait for navigation
- Use `await page.waitForLoadState('networkidle')` to wait for API calls

---

## 🎯 The 6-Step Debugging Cycle

This is the core skill captured from this project's debugging history. Use this for ANY bug or issue.

### Step 1: **REPRODUCE**
- Start the dev server: `npm run dev`
- Navigate to the specific URL or page mentioned in the bug report
- Perform the exact steps to trigger the issue
- Document what you observe vs. what should happen
- **Check browser console for errors** (F12 → Console tab)

### Step 2: **BROWSE**
- Identify ALL relevant component files involved
- Look at recent git commits to find what changed
- Trace the data flow:
  * Component rendering → state management → API calls → response handling
- Check for common React/TypeScript issues:
  * Conditional hooks or early returns (violates React rules)
  * Missing dependency arrays in useEffect/useMemo/useCallback
  * State closures (stale data)
  * Type mismatches from API responses

### Step 3: **VALIDATE WITH TESTS**
- Create or update a Playwright test in `tests/` folder to reproduce the bug
- Run test to confirm bug exists: `npm run test tests/[filename]`
- Screenshots automatically saved to `debug/` folder
- Test should **fail** at this point (proves bug exists)

### Step 4: **RESEARCH**
- Search for error messages: "[error message] React" on Google/StackOverflow
- Check React documentation for rules violations
- Check GitHub issues in related repos:
  * facebook/react
  * supabase/supabase-js
  * microsoft/playwright
- Look for similar patterns in your codebase

### Step 5: **DEBUG & FIX**
- Add console.log statements to trace execution
- Use React DevTools browser extension to inspect component state/props
- Check Network tab to see API responses
- Fix based on what you found (ONE small change at a time):
  * React hooks issue? → Split into separate components or reorder hooks
  * Stale state? → Add missing dependency or refactor closure
  * Type mismatch? → Check API response and add type guard
  * Network issue? → Check error handling, add retry logic
  * Timezone issue? → Use manual date parsing instead of toISOString()

### Step 6: **REPEAT & VALIDATE**
- After fix:
  1. Run the Playwright test again: `npm run test tests/[filename]`
  2. Test in browser manually to verify
  3. Check browser console for new errors
  4. If still broken, go back to Step 2 (dig deeper)
  5. If fixed, verify the test **passes** ✅

---

## 📚 Common Issues & Fixes

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| **Blank page on navigation** | React hooks violation | Extract detail view into separate component |
| **Multi-day opening only creates 2 days** | `for` loop with `setDate()` returns timestamp | Use `while` loop with separate increment |
| **Future dates are disabled** | Wrong month variable in comparison | Compare against current `calendarMonth` not old `dateRange` |
| **User can book same slot twice** | No atomic transaction for booking | Mark opening unavailable in same DB transaction |
| **State not updating** | Missing dependency in useEffect | Add missing variables to dependency array |
| **TypeScript error** | API response doesn't match type | Add type guard or check actual API response |

For more detailed debugging history, see `docs/COPILOT_SKILLS.md`.

---

## 💡 Pro Tips

✅ **DO:**
- Check browser console FIRST (errors are golden)
- Use `npm run test:ui` for interactive test debugging
- Create minimal test - test 1 thing, not 5
- Check screenshots in `debug/` folder
- Search "[error message] React" when stuck
- Take notes on what you know vs. don't know

❌ **DON'T:**
- Change multiple things without testing each
- Ignore console errors
- Skip Playwright validation
- Assume cause without investigating
- Work in production instead of localhost:8080

---

## 📊 Debugging History from This Project

This is why the skills exist - these bugs were debugged and documented:

### 1. React Hooks Violation (Browse list → detail blank)
- **Cause**: Early returns before hooks
- **Fix**: Extract detail view to separate component
- **Skill**: "React Hooks Debugging"
- **Result**: Both `/browse` and `/browse/:id` work perfectly

### 2. Multi-Date Creation (4 days only creates 2)
- **Cause**: `for (d.setDate(...))` returns timestamp, breaks loop condition
- **Fix**: Use `while` loop with separate increment
- **Validation**: Playwright test confirms all 4 openings created

### 3. Calendar Dates Disabled (May/June not selectable)
- **Cause**: Wrong month variable in comparison
- **Fix**: Compare against `calendarMonth.getMonth()` not old `dateRange`
- **Result**: May/June dates now properly selectable

### 4. Booking Race Condition (Double booking possible)
- **Cause**: No atomic transaction when creating appointment
- **Fix**: Mark opening unavailable in same DB operation
- **Database**: Updated `book_opening()` RPC function

See `docs/COPILOT_SKILLS.md` for full details on each.

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
npm run build:dev            # Development build

# Browser DevTools
F12                          # Open DevTools
```

---

## 📝 Instructions for Next Copilot Session

When working on bugs or features:

1. **Start with `.github/copilot-readme.md`** - Friendly index to all documentation
2. **Read this file** - `.github/copilot-instructions.md` - Refresh context on project setup and debugging skills
3. **Use the 6-step debugging cycle** - Follow it systematically (see this file or `.github/copilot-debugging-skill.md`)
4. **Create tests in Playwright** - Put them in `tests/` folder
5. **Save artifacts in debug/** - Screenshots and results
6. **Reference COPILOT_SKILLS.md** - `docs/COPILOT_SKILLS.md` for detailed patterns and history
7. **Update this file** - If you discover new patterns or skills

---

## 📄 Related Documentation

| File | Purpose |
|------|---------|
| `.github/copilot-readme.md` | **START HERE** - Friendly index pointing to all documentation |
| `.github/copilot-instructions.md` | Master instructions (this file) - project overview + 5 skills |
| `.github/copilot-debugging-skill.md` | Quick reference card for the 6-step cycle |
| `docs/DEBUGGING_PROCESS.md` | Step-by-step debugging guide (methodology) |
| `docs/COPILOT_SKILLS.md` | Comprehensive skills reference with detailed examples |
| `docs/CODING_STANDARDS.md` | Code style and conventions |

---

**Last Updated**: 2026-04-15
**Copilot Model**: Claude (any version)
**Project**: time-craft-scheduler-admin
**Status**: Ready for production debugging!

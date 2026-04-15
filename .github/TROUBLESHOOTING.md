# Troubleshooting Guide & Common Fixes

Quick solutions to problems you might encounter. If not here, follow the 6-step debugging cycle from `copilot-debugging-skill.md`.

---

## Booking Issues

### ❌ "Failed to book appointment. Please try again."

**Symptoms:** Click "Book" button → Confirmation dialog opens → Click "Confirm" → Error toast appears

**Root Cause:** RPC function `book_opening(_opening_id, _user_id)` doesn't exist in Supabase schema

**Why it happens:** Migration file created locally but never deployed to Supabase database

**Fix:** Apply Supabase migrations

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project → **SQL Editor** (left sidebar)
3. Click **New query**
4. Run this SQL:

```sql
CREATE OR REPLACE FUNCTION public.book_opening(_opening_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _opening RECORD;
  _appointment_id uuid;
BEGIN
  SELECT * INTO _opening FROM openings WHERE id = _opening_id FOR UPDATE;
  
  IF _opening IS NULL THEN
    RAISE EXCEPTION 'Opening not found';
  END IF;
  
  IF NOT _opening.is_available THEN
    RAISE EXCEPTION 'Opening is no longer available';
  END IF;
  
  IF _opening.user_id = _user_id THEN
    RAISE EXCEPTION 'Cannot book your own opening';
  END IF;

  -- Check if user already has a pending booking for this opening
  IF EXISTS (SELECT 1 FROM appointments WHERE opening_id = _opening_id AND user_id = _user_id AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending booking for this opening';
  END IF;

  INSERT INTO appointments (opening_id, user_id, provider_id, worker, service, location, date, start_time, end_time, duration, status)
  VALUES (_opening.id, _user_id, _opening.user_id, _opening.worker, _opening.service, _opening.location, _opening.date, _opening.start_time, _opening.end_time, _opening.duration, 'pending')
  RETURNING id INTO _appointment_id;

  RETURN _appointment_id;
END;
$$;
```

5. Refresh browser: `http://localhost:8084`
6. Try booking again ✅

**Also check:** Code might pass wrong parameter name
- Look for: `supabase.rpc('book_opening', { _student_id: ... })` ❌ 
- Should be: `supabase.rpc('book_opening', { _user_id: ... })` ✅

**Fixed in:** `src/components/BrowseDetail.tsx` (line 290)

---

## React & Component Issues

### ❌ Blank Page on Navigation

**Symptoms:** Click provider → page goes blank, 0 HTML content

**Root Cause:** React hooks violation - early return before hooks

**Fix:** Extract detail view to separate component

```typescript
// ❌ WRONG
function Browse({ id }) {
  if (!id) return <div>No ID</div>;  // Early return!
  const [data, setData] = useState();  // Won't always run
}

// ✅ FIX
function Browse({ id }) {
  return id ? <BrowseDetail id={id} /> : <div>No ID</div>;
}
function BrowseDetail({ id }) {
  const [data, setData] = useState();  // Always runs
}
```

**Applied to:** `BrowseDetail.tsx` component extraction

**Test:** Run `npm run test tests/debug-browse.spec.ts`

---

### ❌ State Not Updating in useEffect

**Symptoms:** Data fetched but component doesn't update

**Root Cause:** Missing dependency in dependency array

**Fix:** Add all dependencies

```typescript
// ❌ WRONG
useEffect(() => {
  setData(userId);  // userId used but not in deps!
}, []);

// ✅ RIGHT
useEffect(() => {
  setData(userId);
}, [userId]);
```

**Debug:** Check browser console for warnings

---

### ❌ "Rendered more hooks than during the last render"

**Symptoms:** Error message in console

**Root Cause:** Conditional hook calls or wrong hook order

**Fix:** Move conditions outside component or split into separate components

---

## Date & Calendar Issues

### ❌ Multi-Date Opening Only Creates 2 Days (Expected 4)

**Symptoms:** Create opening for 4 days (Sat-Sun), only 2 rows in database

**Root Cause:** `for` loop with `setDate()` breaks because `setDate()` returns timestamp

**Fix:** Use `while` loop with separate increment

```typescript
// ❌ WRONG
for (let d = start; d.setDate(d.getDate() + 1) <= end) {
  // d.setDate() returns timestamp number, not boolean!
  // Loop ends prematurely
}

// ✅ RIGHT
let d = new Date(start);
while (d <= end) {
  // process d
  d.setDate(d.getDate() + 1);
}
```

**Applied to:** `Calendar.tsx` lines 327-350

**Verify:** Check Supabase - should have 4 opening rows

---

### ❌ May/June Dates Show as Disabled/Not Selectable

**Symptoms:** Navigate calendar to May/June → dates disabled even though openings exist

**Root Cause:** Calendar month comparison uses wrong variable

```typescript
// ❌ WRONG
if (day.getMonth() === calendarDateRange.start.getMonth()) {
  // Comparing against OLD dateRange, not current displayed month
}

// ✅ RIGHT
if (day.getMonth() === calendarMonth.getMonth()) {
  // Compare against DISPLAYED month
}
```

**Applied to:** `Calendar.tsx` comparison logic

**Debug:** 
```typescript
console.log('day month:', day.getMonth());
console.log('calendar month:', calendarMonth.getMonth());
```

---

### ❌ Dates Show as 2026-05-01 but in Wrong Timezone

**Symptoms:** Selected date doesn't match what's shown in calendar

**Root Cause:** `new Date("2026-05-01")` interprets as UTC

**Fix:** Parse manually to local timezone

```typescript
// ❌ WRONG
const date = new Date("2026-05-01");  // UTC!

// ✅ RIGHT
const [year, month, day] = "2026-05-01".split('-').map(Number);
const date = new Date(year, month - 1, day);  // Local!

// When outputting, use getDate/getMonth/getFullYear
// NOT toISOString()
```

---

## Booking & Availability Issues

### ❌ User Can Book Same Slot Twice (Race Condition)

**Symptoms:** Two users book same opening simultaneously, both see confirmed

**Root Cause:** No atomic transaction - booking created but opening not marked unavailable

**Fix:** Updated `book_opening()` RPC to atomic transaction

```sql
-- In book_opening() RPC
BEGIN;
INSERT INTO appointments (...) VALUES (...);
UPDATE openings SET is_available = false WHERE id = _opening_id;
COMMIT;
```

**Applied to:** Supabase migration `20260415041100_fix_booking_unavailable.sql`

**Test:** Try booking from 2 browser tabs - second should fail

---

### ❌ Opening Shows as Available Even After Booking

**Symptoms:** User A books → User B still sees it available

**Root Cause:** Opening not marked `is_available = false`

**Fix:** Verify Supabase migration applied

```bash
# Check Supabase SQL Editor
SELECT * FROM openings WHERE id = 'xxx' AND is_available = false;
# Should show the booked opening
```

---

## API & Database Issues

### ❌ 401 Unauthorized from Supabase

**Symptoms:** API calls failing, 401 errors in Network tab

**Root Cause:** Missing or invalid Supabase credentials

**Fix:** Check `.env`

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

**Debug:**
```typescript
import { supabase } from '@/integrations/supabase/client';
console.log('Supabase URL:', supabase.supabaseUrl);  // Should be set
```

---

### ❌ TypeError: Cannot read property 'xxx' of undefined

**Symptoms:** Error in component using API data

**Root Cause:** Data fetching not complete, component tries to access before loaded

**Fix:** Add loading check

```typescript
// ❌ WRONG
function Component() {
  const { data } = useQuery(...);
  return <div>{data.field}</div>;  // data is undefined!
}

// ✅ RIGHT
function Component() {
  const { data, isLoading } = useQuery(...);
  if (isLoading) return <div>Loading...</div>;
  return <div>{data.field}</div>;
}
```

---

## Testing Issues

### ❌ Playwright Test Times Out

**Symptoms:** Test running forever, no completion

**Root Cause:** Page not loading or selector not found

**Fix:** Add explicit waits

```typescript
// ❌ MIGHT TIMEOUT
await page.click('button');
const content = await page.content();

// ✅ BETTER
await page.waitForLoadState('networkidle');
await page.click('button');
await page.waitForURL(/new-url/);
const content = await page.content();
```

**Debug:**
```bash
npm run test:headed  # See what browser sees
npm run test:debug  # Step through test
```

---

### ❌ Book Button Doesn't Work / Clicking Book Does Nothing

**Symptoms:** Click "Book" button → nothing happens, no dialog appears

**Root Cause:** Dialog state was defined but the AlertDialog component was never rendered in JSX

```typescript
// ❌ WRONG
const [showBookingDialog, setShowBookingDialog] = useState(false);
// ... later in JSX ...
<Button onClick={() => setShowBookingDialog(true)}>Book</Button>
// Dialog component never rendered!

// ✅ RIGHT
const [showBookingDialog, setShowBookingDialog] = useState(false);
// ... later in JSX ...
<Button onClick={() => setShowBookingDialog(true)}>Book</Button>
<AlertDialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
  <AlertDialogContent>
    {/* Dialog content */}
  </AlertDialogContent>
</AlertDialog>
```

**Applied to:** `BrowseDetail.tsx` - Added missing dialog JSX

**Fix Steps:**
1. Open `src/components/BrowseDetail.tsx`
2. Find the closing `</div>` at end of component
3. Add AlertDialog component before the final closing div
4. Import Loader2 icon if not already imported

**Test:** Click "Book" button → Booking confirmation dialog appears with details

---

## Performance Issues

### ❌ App Feels Slow

**Symptoms:** Clicking buttons feels sluggish

**Root Cause:** React Query refetching or component re-renders

**Fix:** Check React DevTools Profiler

```bash
# React DevTools browser extension
→ Profiler tab
→ Record interactions
→ Look for unnecessary re-renders
```

**Common causes:**
- Missing keys in lists
- Inline functions causing re-renders
- Expensive computations in render

---

## Browser Issues

### ❌ "Module not found" errors

**Symptoms:** Import paths not working

**Root Cause:** Alias not configured correctly

**Fix:** Check `tsconfig.json` and `vite.config.ts`

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Reset:** Restart dev server after config changes

---

## General Troubleshooting Steps

1. **Check browser console** (F12 → Console tab)
   - Most issues show errors here first

2. **Check Network tab** (F12 → Network tab)
   - See API response codes and payloads

3. **Check React DevTools** (browser extension)
   - Inspect component state and props

4. **Check terminal output** (`npm run dev`)
   - TypeScript/ESLint errors shown here

5. **Clear cache and restart**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

6. **Check git status**
   ```bash
   git status  # See what changed
   git log -n 5  # Recent commits
   ```

7. **Follow 6-step cycle** (see `copilot-debugging-skill.md`)
   - REPRODUCE → BROWSE → VALIDATE → RESEARCH → DEBUG → REPEAT

---

## When Stuck

1. **Search the error message** on Google + "React"
2. **Check GitHub issues** - someone probably had this
3. **Read the error carefully** - it usually says what's wrong
4. **Add console.log** - trace execution flow
5. **Use Playwright test** - reproduce issue in controlled way
6. **Ask team** - document what you find

---

**Last Updated:** 2026-04-15
**Coverage:** React, Calendar, Booking, API, Testing, Performance
**Next:** Add more as issues are discovered

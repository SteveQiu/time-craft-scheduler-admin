# DEBUG SKILL Session: Circle Spinning Issue

**Date:** 2026-04-21  
**Issue:** Circle for today is spinning continuously  
**Credential:** sdeqiu@gmail.com / Soulreap1

---

## Phase 1-2: UNDERSTAND & GATHER EVIDENCE

### Symptoms
- Loading circle visible on today's date in calendar grid
- Spinning indefinitely 
- Blocking user interaction

### Code Analysis

**Loading Overlay (Calendar.tsx lines 620-625):**
```tsx
{loading && (
  <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
    <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></span>
  </div>
)}
```

This is a FULL PAGE OVERLAY that appears when `loading === true`.

### Where Loading State is Set

**Set to TRUE:**
- Line 169: `loadOpeningsForMonth()` - `setLoading(true)`
- Line 481: `addOpening()` - `setLoading(true)`

**Set to FALSE:**
- Line 210: `loadOpeningsForMonth()` finally - `setLoading(false)`
- Line 481: `addOpening()` finally - `setLoading(false)`

### useEffect Dependency (Line 158-163)
```tsx
useEffect(() => {
  if (currentDate && user) {
    loadOpeningsForMonth();
  }
}, [currentDate, user, isOrgMode, acceptedWorkers]);
```

**KEY FINDING:** acceptedWorkers is in dependency array!

If `acceptedWorkers` changes frequently or comes in as new array reference every render, this could cause infinite re-fetches.

### Root Cause Hypotheses

1. **acceptedWorkers causes infinite re-fetches** - If acceptedWorkers array reference changes on every render, useEffect triggers constantly, causing setLoading(true) but finishing too fast to see it... or stuck loading.

2. **acceptedWorkers empty on load** - If acceptedWorkers is empty initially, the query sets openings=[] (line 198). Later when acceptedWorkers populates, useEffect runs again.

3. **Loading state stuck true** - Some error prevents setLoading(false) from running.

### Evidence to Check

- Does acceptedWorkers have a stable reference?
- Is it memoized in useOrgWorkers hook?
- Does it change on every render?

---

## Phase 3: FORM HYPOTHESIS

**PRIMARY HYPOTHESIS:**
`acceptedWorkers` in the dependency array causes infinite re-fetches or perpetual loading state.

**SECONDARY HYPOTHESIS:**
Query filters by acceptedWorkers but they're not available, so the query runs but returns nothing, triggering multiple re-renders.

---

## Next: Phase 4-5 Testing (Test & Verify)

Need to:
1. Check useOrgWorkers hook implementation
2. Verify acceptedWorkers is stable/memoized
3. Test if loading state gets stuck
4. Monitor network requests


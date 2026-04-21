# DEBUG SESSION: Fix 1 - Circle Spinning (acceptedWorkers infinite re-fetches)

## ROOT CAUSE IDENTIFIED

**File:** `src/hooks/useOrgWorkers.tsx` Line 72  
**Problem:** `acceptedWorkers` is recreated on every render

```tsx
// WRONG - creates new array each render
const acceptedWorkers = workers.filter(w => w.status === 'accepted');
```

This new array reference triggers Calendar's useEffect (line 163) repeatedly:
```tsx
}, [currentDate, user, isOrgMode, acceptedWorkers]); // acceptedWorkers is new every render!
```

**Result:** 
1. useEffect runs → loadOpeningsForMonth() → setLoading(true)
2. Query returns quickly  
3. setLoading(false)
4. But React re-renders due to acceptedWorkers being new reference
5. useEffect runs again → loadOpeningsForMonth() → setLoading(true)
6. Loop continues = loading spinner never stops

## SOLUTION

Memoize acceptedWorkers so it only changes when workers array actually changes:

```tsx
// useOrgWorkers.tsx - add useMemo
import { useMemo } from 'react';

export function useOrgWorkers() {
  // ... existing code ...
  
  // CORRECT - memoized, only changes when workers changes
  const acceptedWorkers = useMemo(
    () => workers.filter(w => w.status === 'accepted'),
    [workers]
  );
```

This way:
- acceptedWorkers only changes when workers data actually changes
- Calendar's useEffect won't re-run unnecessarily
- Loading spinner stops after data loads

---

## Fix Implementation

Change in `src/hooks/useOrgWorkers.tsx`:

1. Import useMemo at line 1
2. Wrap acceptedWorkers in useMemo with workers dependency
3. Same for other derived values (optional but cleaner)


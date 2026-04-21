# DEBUG SKILL Session: Opening Removal Bug

**Issue:** After removing an opening in org mode, ALL openings disappear instead of just the one removed.

## Phase 1-2: UNDERSTAND & GATHER EVIDENCE

### Symptoms
- User in org mode viewing calendar
- Clicks delete on one opening
- Opening is deleted from database (success toast shows)
- But now calendar is completely EMPTY
- All other openings gone (not just the deleted one)

### Expected Behavior
- Delete opening by ID
- Reload openings for the month
- Display remaining openings (all except deleted one)

### Code Flow Analysis

**removeOpening() function (lines 515-539):**
```tsx
const removeOpening = async (id: string) => {
  try {
    // 1. Build delete query
    let query = supabase.from('openings').delete().eq('id', id);
    
    // 2. In user mode, add user filter
    if (!isOrgMode) {
      query = query.eq('user_id', user.id);
    }
    // NOTE: In org mode, NO additional filter - only deletes by ID
    
    // 3. Execute delete
    const { error } = await query;
    if (error) throw error;
    
    // 4. Reload all openings for month
    await loadOpeningsForMonth();
    
    // 5. Show success
    toast.success('Opening removed successfully');
  } catch (error) {
    // Handle error
  }
};
```

### After Delete, loadOpeningsForMonth() is Called

Let's trace what happens:

**loadOpeningsForMonth() (lines 166-212):**
```tsx
const loadOpeningsForMonth = async () => {
  if (!currentDate || !user) return;
  try {
    setLoading(true);
    
    // Build date range
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    // ... date calculation ...
    
    let query = supabase.from('openings').select('*').gte('date', startStr).lte('date', endStr);
    
    // FILTERING LOGIC:
    if (!isOrgMode) {
      query = query.eq('user_id', user.id);
    } else if (isOrgMode && acceptedWorkers.length > 0) {
      // Filter by org workers
      const orgWorkerUserIds = acceptedWorkers
        .filter(w => w.user_id)
        .map(w => w.user_id);
      
      if (orgWorkerUserIds.length > 0) {
        query = query.in('user_id', orgWorkerUserIds);
      } else {
        setOpenings([]);
        return;
      }
    } else if (isOrgMode && acceptedWorkers.length === 0) {
      // No workers
      setOpenings([]);
      return;
    }
    
    const { data, error } = await query;
    if (error) throw error;
    setOpenings(data || []);
  } catch (error) {
    console.error('Error loading openings:', error);
    toast.error('Failed to load openings');
  } finally {
    setLoading(false);
  }
};
```

### HYPOTHESIS: acceptedWorkers Becomes Empty After Delete

When removeOpening() calls loadOpeningsForMonth(), what if acceptedWorkers has been invalidated or is temporarily empty?

**Scenario:**
1. User viewing calendar with acceptedWorkers populated
2. Clicks delete on an opening
3. Delete completes
4. loadOpeningsForMonth() runs
5. At this moment, acceptedWorkers is empty or [] (new reference from memoization?)
6. Line 187: `acceptedWorkers.length > 0` is FALSE
7. Lines 201-204: We hit the else if and return empty!

### KEY FINDING

The memoization fix we made might have introduced a new bug!

When openings change in the component, React Query cache invalidates. This might cause acceptedWorkers to be re-evaluated momentarily, creating a NEW empty array reference.

Even though acceptedWorkers is memoized, if the underlying `workers` data is being invalidated (which it might be after a mutation), the useMemo would create a new empty array momentarily.

---

## Phase 3: FORM HYPOTHESIS

**PRIMARY HYPOTHESIS:**
After delete, React Query invalidates the org_workers cache, which causes workers to become temporarily empty, which causes acceptedWorkers (via useMemo) to become an empty array, which causes loadOpeningsForMonth() to return empty immediately without fetching.

**SECONDARY HYPOTHESIS:**
The delete mutation somehow affects the React Query cache for openings, causing acceptedWorkers to be unavailable when loadOpeningsForMonth() runs.

---

## Phase 4-5: TEST HYPOTHESIS

Need to check:
1. Does org_workers query get invalidated on opening delete?
2. Is acceptedWorkers still populated when removeOpening calls loadOpeningsForMonth()?
3. Is there a race condition with cache invalidation?

---

## Phase 6: IMPLEMENT FIX

**Solution:** Ensure loadOpeningsForMonth() uses a stable, pre-fetched list of worker IDs instead of relying on acceptedWorkers at call time.

OR: Ensure acceptedWorkers is NOT empty when loadOpeningsForMonth() runs by:
1. Not clearing acceptedWorkers unnecessarily
2. Passing worker IDs to loadOpeningsForMonth() as parameter
3. Using a more robust check before filtering


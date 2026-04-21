# Debug Skill: Systematic Debugging Process

## Purpose
A structured debugging process to solve issues end-to-end. Loop through these steps until the problem is solved.

## Debugging Loop

### Phase 1: Understand the Problem
1. **Clarify the issue**
   - What is the user experiencing?
   - Where does it happen? (URL, component, flow)
   - What should happen vs what actually happens?
   - Is it consistent or intermittent?

2. **Gather initial information**
   - Check browser console for errors
   - Check network tab for failed requests
   - Look at recent code changes related to issue
   - Ask: Is this a new bug or was it always broken?

### Phase 2: Gather Evidence

#### Code Investigation
```bash
# Search for relevant code
grep -r "componentName\|functionName" src/

# Check recent commits
git log --oneline -20 --grep="keywords"

# Diff to see what changed
git diff HEAD~1 src/components/ComponentName.tsx
```

#### Browser Debugging
1. Open DevTools (F12)
2. Check Console tab for errors
3. Check Network tab:
   - Are API requests being sent?
   - What status codes? (200, 400, 401, 403, 500, etc)
   - What is the response data?
4. Check Application tab:
   - Local storage (auth tokens?)
   - Session storage
   - Cookies

#### Database Investigation
```javascript
// Query Supabase directly
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('condition', 'value');
console.log(data, error);
```

#### Component State Debugging
Add temporary logs to component:
```typescript
useEffect(() => {
  console.log('🔍 DEBUG:', { acceptedWorkers, workerData, isOrgMode });
}, [acceptedWorkers, workerData, isOrgMode]);
```

### Phase 3: Form Hypothesis

Possible causes (most to least likely):
1. **Data/Query Issue** - Wrong filter, empty result, null values
2. **Authorization/Permissions** - RLS policy blocking, user not authenticated
3. **Initialization Order** - Using variable before it's defined, dependency array wrong
4. **Conditional Logic** - if/else branch not taken, wrong condition
5. **Type Mismatch** - Expected object, got null; expected string, got number
6. **Race Condition** - Async operations not awaited, state updates happening out of order
7. **Caching** - Old data cached, need to invalidate React Query

### Phase 4: Test Hypothesis

#### Isolate the Problem
- Add console logs to narrow down where it breaks
- Test with different inputs/conditions
- Create minimal reproduction case
- Check if problem is in component, hook, or API

#### Validate Assumptions
- Print actual values at each step
- Compare with expected values
- Check type of data (is it really what we think?)
- Verify array length, object keys, null checks

Example:
```typescript
console.log('acceptedWorkers:', acceptedWorkers); // What is the actual data?
console.log('acceptedWorkers.length:', acceptedWorkers.length); // Empty?
console.log('First worker:', acceptedWorkers[0]); // Has user_id?
console.log('user_ids:', acceptedWorkers.map(w => w.user_id)); // Are they null?
```

### Phase 5: Verify Root Cause

- Can you reproduce the issue consistently?
- Does it only happen with certain data?
- Does it happen in certain mode (user vs org)?
- Can you trace the bug through the entire flow?

### Phase 6: Implement Fix

- Make minimal, surgical changes
- Don't fix unrelated issues
- Update related functions if needed
- Add comments explaining why this fix was needed

### Phase 7: Validate Fix

#### Playwright Tests (NEW - Create for all fixes)
**This is now part of the required validation process!**

```bash
# 1. Create Playwright test file for the fix
# tests/validate-<bug-name>.spec.ts

# Example structure:
# - Test the fixed behavior
# - Test that regression doesn't occur
# - Test edge cases
# - Verify code changes are present

# 2. Run the tests
npm test tests/validate-<bug-name>.spec.ts

# 3. Update snapshots if needed
npm test -- --update-snapshots
```

**Playwright Test Template:**
```typescript
test.describe('Bug Fix: <Issue Name>', () => {
  test('Should fix the specific issue', async ({ page }) => {
    // Reproduce the exact scenario
    // Verify the fix works
    // Check no console errors
  });

  test('Should not regress related features', async ({ page }) => {
    // Test similar but slightly different scenario
    // Ensure you didn't break anything else
  });

  test('Code changes are present', async () => {
    // Verify the fix was actually applied
    const file = require('fs').readFileSync('src/file.tsx', 'utf-8');
    expect(file).toContain('expectedFix');
  });
});
```

**Why Playwright Tests Matter:**
- Automated validation (no manual testing needed)
- Catches regressions in future changes
- Documents what "fixed" means
- Creates visual snapshots for regression detection
- Tests both code and runtime behavior

#### Code Validation
```bash
# Check syntax
npm run lint

# Run existing tests
npm test

# Check build
npm run build
```

#### Manual Testing
1. Test the exact scenario that was broken
2. Test related features (didn't break anything)
3. Test edge cases (empty data, null values, etc)
4. Test different modes/views

#### Browser Testing
1. Open DevTools
2. Clear cache/storage if needed
3. Reload page
4. Verify fix works
5. Check for new errors in console

### Phase 8: Loop Until Solved

If problem still exists:
- Go back to Phase 2 (gather more evidence)
- Refine hypothesis with new data
- Test new hypothesis
- Repeat until solved

If problem is solved:
- Update .github/DEBUG_SKILL.md if new patterns discovered
- Document the fix in .github/
- Validate the fix follows code guidelines

## Common Debugging Patterns

### Pattern: Empty Array / No Results

Check in this order:
1. Is data being fetched? (network request made?)
2. Is data valid? (check response in network tab)
3. Is filter too strict? (removing all items?)
4. Are there any null checks removing valid data?

```typescript
// Debug empty array
console.log('Raw data:', data);           // What came from API?
console.log('After filter:', filtered);   // What after filter?
console.log('Filter logic:', data.filter(x => x.status === 'accepted')); // Correct logic?
```

### Pattern: Null Pointer Exception

Check in this order:
1. Is variable defined?
2. Is it assigned a value?
3. Are you accessing a property that exists?
4. Are you checking for null/undefined?

```typescript
console.log('user:', user);                    // Defined?
console.log('user?.id:', user?.id);            // Has id property?
console.log('typeof user:', typeof user);      // What type is it?
```

### Pattern: Wrong Data Displayed

Check in this order:
1. Is correct data being queried?
2. Is correct data being filtered?
3. Is correct data being rendered?
4. Is cache showing old data?

```typescript
// Debug wrong data
console.log('Query params:', { org_id, user_id });  // Querying for right thing?
console.log('Result:', data);                        // Got the right data?
console.log('In UI:', document.body.innerText);      // Rendering the right thing?
```

### Pattern: Authorization Denied

Check in this order:
1. Is user authenticated? (user?.id exists?)
2. Is user authorized? (right permissions?)
3. Is RLS policy correct? (check Supabase)
4. Is auth header sent? (check network tab)

```typescript
console.log('user:', user);                  // Authenticated?
console.log('user.id:', user?.id);           // Has ID?
console.log('user_type:', user?.user_type);  // Right type?
```

### Pattern: Infinite Loop / Performance Issue

Check in this order:
1. Is useEffect dependency array correct?
2. Is function being called repeatedly?
3. Is state being updated in render?
4. Is query being re-fetched too often?

```typescript
// Debug loop
console.log('useEffect running...');  // Add at start of effect
console.log('Dependencies:', [dep1, dep2, dep3]);  // Are these changing?
```

## Tools to Use

### Browser DevTools
- **Console**: Errors, logs, commands
- **Network**: HTTP requests, responses
- **Application**: Storage, cookies, cache
- **Sources**: Set breakpoints, step through code

### Code Search
```bash
grep -n "searchTerm" src/components/File.tsx
grep -r "functionName" src/
```

### Git
```bash
git log --oneline -10
git diff HEAD~1 src/file.tsx
git blame src/file.tsx  # Who changed what when
```

### Database Query
```javascript
// Test queries directly
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('id', 'value');
```

### React DevTools
- Inspect component props
- Watch state changes
- Check render counts
- Trace re-renders

## Success Criteria

Problem is solved when:
- ✅ Root cause is identified and documented
- ✅ Fix is implemented and tested
- ✅ **Playwright tests created to validate the fix**
- ✅ **Playwright tests all pass**
- ✅ No new errors in console
- ✅ Related features still work
- ✅ Edge cases handled
- ✅ Solution is minimal and surgical
- ✅ `.github/` updated with debugging learnings

## Remember

- **Don't assume** - Verify with logs/network tab
- **Narrow down** - Add logs to isolate where it breaks
- **One change at a time** - Don't fix multiple things at once
- **Test thoroughly** - Check both happy path and edge cases
- **Document** - Update .github/ with what you learned

## Example: Actual Debugging Session

**Problem**: Org calendar shows no openings

**Investigation**:
1. Check browser console - no errors
2. Check network tab - API request made successfully
3. Add logs to component:
   ```typescript
   console.log('acceptedWorkers:', acceptedWorkers);  // Printed: []
   console.log('workerData:', workerData);            // Printed: [...]
   ```
4. Found: acceptedWorkers empty, workerData not empty
5. Hypothesis: Using wrong variable
6. Check code: `loadOpeningsForMonth` uses `workerData` instead of `acceptedWorkers`
7. Root cause: invited workers in array with user_id=null, filter removes them
8. Fix: Use `acceptedWorkers` instead
9. Validate: Test with both scenarios works

Result: Issue solved! 🎉

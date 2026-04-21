# BUG: Multi-Date Openings Creation Form Validation Failure

## Issue
When attempting to create multi-date openings in org mode, the form validation fails silently. The form shows all fields filled correctly but the "Add Opening" button does not submit - instead it remains open with no visible error message.

##Actual Findings from Testing
- **Form displays correctly** with all date fields visible and populated
- **Date Range filled**: 05/01/2026 to 05/07/2026 ✓
- **Worker selected**: Steve ✓
- **Service selected**: Hair cut ✓
- **Days of Week**: All 7 days selected by default ✓
- **Submit button clicked** but dialog remains open
- **No error toast** displayed
- **Database check**: 0 openings created in May 2026
- **Conclusion**: Form submission silently fails with validation error

## Reproduction Steps
1. Sign in as org admin (sdeqiu)
2. Navigate to `/calendar?mode=org` (currently showing April)
3. Click "Add Opening" button
4. Enable "Create multiple date slots" toggle
5. Fill date range: 05/01/2026 to 05/07/2026
6. Scroll to fill Worker (Steve) and Service (Hair cut)
7. Click "Add Opening" button
8. **BUG**: Dialog stays open, no openings created, no error message

## Expected Behavior
- Form should submit and create 5-7 openings (May 1-7, all weekdays)
- Calendar should navigate to May and show new openings
- Toast notification should confirm creation
- On refresh, openings should persist

## Actual Behavior
- Form does not submit
- No error message displayed
- No openings created in database
- Form appears to have all required fields filled

## Root Cause (SUSPECTED)
Looking at validation code in Calendar.tsx (lines 218-260), the form validates:
- ✓ startTime
- ✓ worker (org mode)
- ✓ service
- ❌ **location** - "Address is required" (line 233-235)
- ✓ duration
- ✓ multipleSlots.interval
- ✓ multipleDates.dateRangeStart
- ✓ multipleDates.dateRangeEnd

### THE ISSUE: Location field is required but may not be filled
- The form requires a location but multi-date mode might not have it filled
- Form scrolls but user may not see location field
- No visual indication that location is missing when form fails to submit

## Code Location
- **File**: `src/components/Calendar.tsx`
- **Function**: `validateForm()` (lines 218-260)
- **Problem Line**: 233-235
  ```typescript
  if (!newOpening.location || !newOpening.location.trim()) {
    newErrors.location = 'Address is required';
  }
  ```

## Solution
When "Create multiple date slots" is enabled, the location field validation should:
1. Show visual indication that it's required
2. Ensure the field is visible on screen (may be cut off when scrolling)
3. Either:
   - Make location optional for multi-date creation, OR
   - Auto-fill location from a default if not provided, OR
   - Ensure form scrolls to show location field before validation

## Test Case to Verify Fix
```javascript
test('multi-date opening creation works with location filled', async () => {
  // Create multi-date opening
  // Ensure location field is filled
  // Submit form
  // Verify: Form closes and toast succeeds
  // Verify: Openings appear in database
  // Verify: Opening persists after page refresh
})
```

## Related Issues
- After fixing creation, need to also fix:
  - Calendar should show month navigation to view created openings
  - Or auto-navigate to month containing created openings
  - Or fetch all openings regardless of month

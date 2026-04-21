# Playwright Validation Process

## Purpose
Autonomously validate features end-to-end before presenting to user. Don't ask users to test manually.

## When to Use
- After implementing new feature
- Before claiming "feature is ready"
- To verify form submissions, navigation, database updates
- To catch RLS, auth, or API errors

## Validation Checklist (DO THIS EVERY TIME)

For **code changes**, run code validation first:
```bash
# Example: for opening deletion fix
node tests/validate-deletion-code.js
```

For **UI features**, run browser validation:
```bash
# Example: for bookmark feature
node tests/validate-bookmark-feature.js
```

### Code Validation Template

Check for critical patterns in changed files:
- ✅ Conditional logic is correct (if/else branches)
- ✅ Query filters apply in all cases
- ✅ No hardcoded values that should be dynamic
- ✅ Error handling is present
- ✅ Related functions are updated (e.g., reload after delete)

### Browser Validation Template

```javascript
// Example: Test bookmark feature
const browser = await chromium.launch();
const page = await browser.newPage();

// 1. Navigate to profile
await page.goto('http://localhost:8080/profile/PROVIDER_ID');
await page.waitForLoadState('networkidle');

// 2. Check if page loaded
const profileName = await page.textContent('h2');
console.log('Profile loaded:', profileName);

// 3. Click bookmark button
await page.click('button:has-text("Bookmark")');
await page.waitForTimeout(500);

// 4. Check for success toast
const toast = await page.textContent('text=Added to bookmarks');
if (toast) {
  console.log('✅ Bookmark added successfully');
} else {
  console.log('❌ No success toast - bookmark insert failed');
}

// 5. Verify database
const bookmarks = await supabase
  .from('bookmarks')
  .select('*')
  .eq('user_id', userId);
console.log('Database check:', bookmarks.data);

await browser.close();
```

## Status Check Format
Always report:
- ✅ PASS - Feature works end-to-end
- ⚠️ PARTIAL - Some parts work
- ❌ FAIL - Broken, error details

## Common Validation Scenarios

### Scenario 1: After Adding/Deleting Records
- Code validation: Check DELETE/INSERT filters
- Browser validation: Verify affected records are updated
- DB validation: Query table to confirm state

**Example**: Opening deletion fix
- Code check: `.eq('id', id)` filter is correct
- Browser check: Remaining openings visible after delete
- DB check: Opening count decreased

### Scenario 2: After Authorization Changes
- Code validation: Check conditional auth logic
- Browser validation: Test with multiple user types
- RLS validation: Verify policies in Supabase

**Example**: Org mode opening visibility
- Code check: `if (isOrgMode)` branches filter correctly
- Browser check: Org mode only shows org workers' openings
- RLS check: RLS policies enforce authorization

### Scenario 3: After Query Changes
- Code validation: Check all query conditions
- Browser validation: Verify search/filter results
- Performance check: Monitor query response times

## Don't Skip Validation

If you claim "ready to test", validate first. Period.

Common failures caught by validation:
- ❌ Query filters missing in certain code paths
- ❌ State not reloaded after operations
- ❌ Conditional logic inverted (if vs if-not)
- ❌ Toast messages shown but operation failed
- ❌ UI updated but database unchanged
- ❌ Authorization checks bypassed

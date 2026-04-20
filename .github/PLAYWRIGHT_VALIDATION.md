# Playwright Validation Process

## Purpose
Autonomously validate features end-to-end before presenting to user. Don't ask users to test manually.

## When to Use
- After implementing new feature
- Before claiming "feature is ready"
- To verify form submissions, navigation, database updates
- To catch RLS, auth, or API errors

## Test Template

```javascript
// Example: Test bookmark feature
const browser = await chromium.launch();
const page = await browser.newPage();

// 1. Navigate to profile
await page.goto('http://localhost:8081/profile/PROVIDER_ID');
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

## Don't Skip Validation
If you claim "ready to test", validate first. Period.

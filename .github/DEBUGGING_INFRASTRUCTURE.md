# 🔍 Booking Debug Infrastructure - Using Playwright DevTools Capture

## What We've Built

Instead of needing Chrome DevTools MCP (which requires Node 20+), we've created a comprehensive debugging system using **Playwright's native capabilities** to capture:

✅ All network requests (URLs, methods, headers, responses)
✅ All console messages (logs, errors, warnings)
✅ Page errors with full stack traces
✅ Screenshots at key moments
✅ RPC function calls and responses
✅ Authentication state changes

## How to Use

### Run a Debugging Test

```bash
npm test tests/booking-debug-full.spec.ts
```

This test will:
1. Navigate to the opening URL
2. Capture ALL network events
3. Capture ALL console messages
4. Click Sign In
5. Save all data to `debug/booking-debug-data/`

### Files Generated

After running, check:
- `debug/booking-debug-data/network-requests.json` - All HTTP requests/responses
- `debug/booking-debug-data/console-messages.json` - All browser console output
- `debug/booking-debug-data/page-errors.json` - Page errors with stack traces
- `debug/booking-debug-data/*.png` - Screenshots

## Key Data Captured

### Network Requests
- Supabase API calls (auth, queries, RPC)
- Static asset loads
- WebSocket connections
- Response status codes and bodies

### Console Messages
- React DevTools hints
- Auth state changes
- Component lifecycle logs
- Custom logs from our code
- Error messages

### Page Errors
- Stack traces with file/line numbers
- Error messages
- Full error objects

## Recent Test Results

**Test Date**: April 15, 2026 14:29 UTC

**Findings:**
- ✅ Page loads successfully
- ✅ OpeningView component renders
- ✅ Sign In button visible (not authenticated)
- ✅ Supabase queries working (status 200)
- ✅ Network requests captured without issues
- ⚠️ 406 errors on initial page load (non-critical static resources)

**Network Summary:**
- 105 total requests captured
- Supabase queries: ✅ Working
- Auth state: Initial/null (not authenticated)
- Opening fetch: ✅ Retrieved successfully

## Debugging a Specific Issue

### To Debug Booking Failure

1. **Run the test**:
   ```bash
   npm test tests/booking-debug-full.spec.ts
   ```

2. **Check the network requests**:
   ```bash
   cat debug/booking-debug-data/network-requests.json
   ```
   Look for RPC calls to `book_opening`

3. **Check console for errors**:
   ```bash
   cat debug/booking-debug-data/console-messages.json | grep -i error
   ```

4. **Check page errors**:
   ```bash
   cat debug/booking-debug-data/page-errors.json
   ```

5. **Look at screenshots**:
   - `opening-01-page-loaded.png` - Initial page
   - `signin-dialog.png` - Sign in dialog
   - `book-dialog.png` - Booking confirmation
   - `result.png` - Final result

## How to Add More Debugging

### Capture RPC Response Body

Update `tests/booking-debug-full.spec.ts` to capture response bodies:

```typescript
page.on('response', response => {
  if (response.url().includes('rpc')) {
    response.text().then(body => {
      // Already captured in test!
      console.log('RPC Response:', body);
    });
  }
});
```

### Evaluate JavaScript in Browser

```typescript
const result = await page.evaluate(() => {
  return {
    authUser: window.__SUPABASE_USER__,
    localStorage: {...localStorage},
    bookingState: window.__BOOKING_STATE__
  };
});
```

### Get Full Page HTML

```typescript
const html = await page.content();
fs.writeFileSync('debug/page-html.html', html);
```

## Advantages Over Chrome DevTools MCP

✅ No Node 20 requirement (works on Node 18+)
✅ Built into Playwright (no extra setup)
✅ Automatic screenshot capture
✅ Structured JSON output
✅ Network request interception
✅ Console message capture
✅ Error tracking with stack traces
✅ Can be committed to git and replayed

## Next Steps

1. **Run the full debug test** to understand booking flow
2. **Analyze network requests** for RPC failures
3. **Check console for specific error messages**
4. **Add custom logging** to understand user flow
5. **Fix issues** based on what you find

## Testing Booking with Debug Capture

To test with full debugging:

```bash
# 1. Start dev server
npm run dev

# 2. In another terminal, run debug test
npm test tests/booking-debug-full.spec.ts

# 3. Check results
cat debug/booking-debug-data/console-messages.json
cat debug/booking-debug-data/network-requests.json

# 4. Look for RPC calls in network data
grep -i "book_opening" debug/booking-debug-data/network-requests.json
```

## Tips for Effective Debugging

1. **Parallel browser windows**: Run dev server, debug test, and manual browser all at once
2. **Replay tests**: Re-run same test to confirm findings are consistent
3. **Incremental testing**: Modify test to stop at each step and inspect
4. **Network filtering**: Search requests for specific URLs (supabase, rpc, etc.)
5. **Timeline analysis**: Use timestamps to understand request order

This approach gives you **Chrome DevTools-level visibility without needing Chrome DevTools MCP!**

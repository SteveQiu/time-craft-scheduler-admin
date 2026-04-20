# Deployment & Testing Checklist

## Pre-Deployment

- [ ] Code reviewed and build passes
- [ ] Browser dev server running (`npm run dev`)
- [ ] Access to Supabase SQL editor

## Deployment Steps

### 1. Apply Database Migration
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Copy contents of: `supabase/migrations/20260417_add_premium_subscriptions.sql`
- [ ] Paste into SQL editor
- [ ] Click "Run"
- [ ] Verify: No errors in console

**Verification Command**:
```sql
SELECT * FROM pg_tables WHERE tablename = 'subscriptions';
-- Should return 1 row (subscriptions table exists)
```

### 2. Verify Helper Functions
- [ ] Run in SQL editor:
```sql
SELECT is_user_premium('00000000-0000-0000-0000-000000000000'::UUID);
-- Should return: false (correct - no subscription for test UUID)
```

- [ ] Run in SQL editor:
```sql
SELECT * FROM get_subscription_status('00000000-0000-0000-0000-000000000000'::UUID);
-- Should return: (empty) or (null) - correct
```

### 3. Verify Frontend Changes
- [ ] Open browser → http://localhost:8080
- [ ] Navigate to `/browse`
- [ ] Click on any provider
- [ ] Should see "View Profile" button in top right
- [ ] No errors in browser console

## Testing

### Test 1: Profile Button Navigation
- [ ] Go to `/browse`
- [ ] Click on any provider name
- [ ] See URL: `/browse/{providerId}`
- [ ] Look for "View Profile" button in top right
- [ ] Click button
- [ ] Should navigate to `/profile/{providerId}`
- [ ] Should load provider's profile page

**Expected Result**: Profile page loads with provider info

### Test 2: Add Premium Subscription
- [ ] In Supabase SQL Editor, run:
```sql
-- Get a user ID from profiles
SELECT id FROM profiles WHERE id IS NOT NULL LIMIT 1;
-- Copy the ID
```

- [ ] Create subscription for that user:
```sql
INSERT INTO subscriptions (user_id, plan_type, status, started_at)
VALUES ('PASTE_ID_HERE'::UUID, 'premium', 'active', NOW());
```

- [ ] Verify insertion:
```sql
SELECT * FROM subscriptions WHERE user_id = 'PASTE_ID_HERE'::UUID;
-- Should show: 1 row with plan_type='premium', status='active'
```

### Test 3: Premium Badge Display
- [ ] In browser, navigate to `/browse/{providerId}` (use the ID from above)
- [ ] Should see **Premium badge** with crown icon ♔
- [ ] Badge text should say "Premium"
- [ ] Badge styling: amber/gold background
- [ ] Badge should appear next to provider name
- [ ] "View Profile" button still visible

**Expected**: 
```
[← Back] Provider Name [Premium ♔] | [View Profile]
```

### Test 4: Premium Status Check
- [ ] In SQL Editor, verify function works:
```sql
SELECT is_user_premium('PASTE_ID_HERE'::UUID);
-- Should return: true (because subscription is active)
```

### Test 5: Multiple Premium Tiers
- [ ] Add "pro" subscription:
```sql
INSERT INTO subscriptions (user_id, plan_type, status, started_at)
SELECT id, 'pro', 'active', NOW() FROM profiles LIMIT 1 OFFSET 1;
```

- [ ] Browse to that provider's page
- [ ] Should show "Premium" badge (works for pro too)
- [ ] View Profile button should work

### Test 6: Inactive Subscription (No Badge)
- [ ] Add inactive subscription:
```sql
INSERT INTO subscriptions (user_id, plan_type, status, started_at)
SELECT id, 'premium', 'inactive', NOW() FROM profiles LIMIT 1 OFFSET 2;
```

- [ ] Browse to that provider's page
- [ ] Should **NOT** show premium badge
- [ ] Verify in SQL:
```sql
SELECT is_user_premium('THAT_ID'::UUID);
-- Should return: false
```

### Test 7: Expired Subscription (No Badge)
- [ ] Add expired subscription:
```sql
INSERT INTO subscriptions (user_id, plan_type, status, started_at, expires_at)
SELECT id, 'premium', 'active', NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day' FROM profiles LIMIT 1 OFFSET 3;
```

- [ ] Browse to that provider's page
- [ ] Should **NOT** show premium badge
- [ ] Verify in SQL:
```sql
SELECT is_user_premium('THAT_ID'::UUID);
-- Should return: false (expired)
```

## Troubleshooting

### Premium Badge Not Showing
1. **Check subscription exists**:
```sql
SELECT * FROM subscriptions WHERE user_id = 'provider_id'::UUID;
```

2. **Check status is 'active'**:
```sql
SELECT plan_type, status, expires_at FROM subscriptions 
WHERE user_id = 'provider_id'::UUID;
-- Should show: plan_type='premium' or 'pro', status='active'
```

3. **Check expiration**:
```sql
SELECT expires_at, NOW() FROM subscriptions WHERE user_id = 'provider_id'::UUID;
-- expires_at should be NULL or in future
```

4. **Test function directly**:
```sql
SELECT is_user_premium('provider_id'::UUID);
-- Should return: true
```

5. **Hard refresh browser**:
- Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- Clear browser cache

### View Profile Button Not Working
1. Check browser console for errors (F12)
2. Verify providerId exists in URL
3. Try navigating directly: `/profile/{providerId}`
4. Check profile page loads

### Build Errors
1. Run: `npm run build`
2. Check for TypeScript errors
3. Verify imports are correct

## Performance Checks

- [ ] Loading a provider page < 1 second
- [ ] Premium status fetches quickly
- [ ] No N+1 query problems
- [ ] Browser console has no errors

## Security Checks

- [ ] Can't view other users' subscription details
- [ ] RLS policies enforced
- [ ] No sensitive data exposed in frontend
- [ ] Profile data is public (as intended)

## Final Checklist

- [ ] Migration applied successfully
- [ ] All SQL queries return expected results
- [ ] Premium badge shows for premium users
- [ ] Premium badge doesn't show for free users
- [ ] "View Profile" button works
- [ ] Profile page loads correctly
- [ ] Expired subscriptions don't show badge
- [ ] Inactive subscriptions don't show badge
- [ ] Build passes without errors
- [ ] Browser console has no errors
- [ ] No performance issues

## Rollback Plan (If Needed)

**To remove all changes**:

```bash
supabase migration down
```

Or manually drop table:
```sql
DROP TABLE IF EXISTS subscriptions CASCADE;
```

Then revert code changes to `BrowseDetail.tsx`.

---

**Status**: ✅ Ready to Deploy!

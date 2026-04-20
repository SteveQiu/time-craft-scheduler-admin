# Quick Deploy: Premium Subscriptions & Profile Button

**Time**: ~2 minutes  
**Status**: Ready ✅

## What's New

1. ✅ Premium subscription tracking in database
2. ✅ Premium badge on provider pages
3. ✅ Profile button to visit provider profiles
4. ✅ Helper functions to check premium status

## One-Step Deploy

```bash
# Apply migration
supabase migration up
```

That's it! Frontend changes are already live in dev server.

## Verify It Works

### In Terminal
```sql
-- In Supabase SQL Editor, run:
SELECT * FROM subscriptions LIMIT 1;
-- Should show: table exists

SELECT is_user_premium('00000000-0000-0000-0000-000000000000'::UUID);
-- Should return: false (no subscription yet)
```

### In Browser (http://localhost:8080)

1. Go to `/browse`
2. Click on any provider → `/browse/{providerId}`
3. You should see:
   - ✅ "View Profile" button (top right)
   - ❌ No premium badge yet (need to add subscription)

### Enable Premium for Testing

```sql
-- In Supabase SQL Editor:
-- First, get a real user ID from profiles table:
SELECT id FROM profiles LIMIT 1;
-- Copy that ID

-- Then insert subscription:
INSERT INTO subscriptions (user_id, plan_type, status, started_at)
VALUES ('PASTE_USER_ID_HERE'::UUID, 'premium', 'active', NOW());

-- Refresh browser - should now show premium badge!
```

## File Changes

```
NEW:
supabase/migrations/20260417_add_premium_subscriptions.sql

UPDATED:
src/components/BrowseDetail.tsx
  - Added premium status check
  - Added premium badge display
  - Added "View Profile" button
```

## Architecture

```
Browse Detail Page
    ↓
useEffect → is_user_premium(providerId)
    ↓
Database checks subscription
    ↓
Show badge if active premium/pro
Show "View Profile" button → /profile/{userId}
```

## Testing Scenario

1. **Setup**: Add test subscription
```sql
INSERT INTO subscriptions (user_id, plan_type, status, started_at)
SELECT id, 'premium', 'active', NOW() FROM profiles LIMIT 1;
```

2. **Test**: Browse to provider
   - URL: `/browse/{userId from above}`
   - Should show: Premium badge + View Profile button

3. **Click**: "View Profile"
   - Navigates to `/profile/{userId}`
   - Shows provider's full profile

## Database Queries Reference

### Check if user is premium
```sql
SELECT is_user_premium('user-id'::UUID);
-- Returns: boolean (true/false)
```

### Get subscription details
```sql
SELECT * FROM get_subscription_status('user-id'::UUID);
-- Returns: {plan_type, status, is_active, expires_at}
```

### List all premium users
```sql
SELECT user_id, plan_type FROM subscriptions 
WHERE status = 'active' AND plan_type IN ('premium', 'pro');
```

### Add subscription (admin)
```sql
INSERT INTO subscriptions (user_id, plan_type, status, started_at)
VALUES ('user-id'::UUID, 'premium', 'active', NOW());
```

### Cancel subscription
```sql
UPDATE subscriptions SET status = 'cancelled' 
WHERE user_id = 'user-id'::UUID;
```

## Troubleshooting

### Premium badge not showing after adding subscription
1. Refresh browser (hard refresh: Ctrl+Shift+R)
2. Check subscription in database:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = 'user-id'::UUID;
   ```
3. Verify status='active' and plan_type='premium'

### "View Profile" button not working
1. Check browser console for errors
2. Verify profile route works: `/profile/{userId}`
3. Try directly typing the URL

---

**All done!** Premium subscriptions and profile browsing are live. 🚀

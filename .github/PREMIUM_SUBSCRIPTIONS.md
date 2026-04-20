# Premium Subscriptions & User Profiles

**Status**: ✅ Implemented  
**Features**: 
- Premium subscription tracking
- Provider profile browsing
- Premium badge display

## Overview

Users can now have premium subscriptions that unlock enhanced visibility on the platform. Premium users are highlighted with a badge, and visitors can view provider profiles.

## What Was Added

### 1. Database Changes
**Migration**: `20260417_add_premium_subscriptions.sql`

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  plan_type TEXT ('free', 'premium', 'pro'),
  status TEXT ('active', 'inactive', 'cancelled'),
  started_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

**Features**:
- ✅ Track subscription plan type (free/premium/pro)
- ✅ Track subscription status (active/inactive/cancelled)
- ✅ Track expiration dates for renewals
- ✅ Row-level security policies enforced
- ✅ Helper functions for checking premium status

### 2. Backend Functions

**`is_user_premium(p_user_id UUID) → BOOLEAN`**
Returns true if user has an active premium or pro subscription.

```sql
SELECT is_user_premium('user-id'::UUID);
-- Returns: true or false
```

**`get_subscription_status(p_user_id UUID) → TABLE`**
Returns detailed subscription info including plan type, status, and expiration.

```sql
SELECT * FROM get_subscription_status('user-id'::UUID);
-- Returns: {plan_type, status, is_active, expires_at}
```

### 3. Frontend Changes

**Component**: `BrowseDetail.tsx`

**New Features**:
- ✅ Fetches premium status for each provider
- ✅ Shows "Premium" badge with crown icon
- ✅ "View Profile" button to navigate to provider profile
- ✅ Premium indicator on browse detail page

**UI Elements**:
```
[← Back] Provider Name [Premium ♔] | [👤 View Profile]
         X available appointments
```

**Code Added**:
```typescript
// Fetch premium status
useEffect(() => {
  if (providerId) {
    supabase.rpc('is_user_premium', { p_user_id: providerId })
      .then(({ data }) => setIsPremium(data || false));
  }
}, [providerId]);

// Navigate to profile
navigate(`/profile/${currentProvider.user_id}`)
```

## How It Works

### User Flow: Viewing Provider

1. Browse providers: `/browse`
2. Click on a provider → `/browse/{providerId}`
3. See provider details with:
   - ✅ Premium badge (if applicable)
   - ✅ "View Profile" button
4. Click "View Profile" → `/profile/{userId}`
5. View full provider profile with reviews, skills, etc.

### Subscription Logic

```
User has subscription
  ↓
plan_type = 'premium' or 'pro'
  ↓
status = 'active'
  ↓
expires_at IS NULL or expires_at > NOW()
  ↓
Result: PREMIUM ✅
```

If any condition fails → Not premium

## Database Schema

### `subscriptions` Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `profiles(id)` |
| `plan_type` | TEXT | 'free', 'premium', 'pro' |
| `status` | TEXT | 'active', 'inactive', 'cancelled' |
| `started_at` | TIMESTAMP | When subscription began |
| `expires_at` | TIMESTAMP | When subscription expires (NULL = no expiry) |
| `created_at` | TIMESTAMP | Record created at |
| `updated_at` | TIMESTAMP | Record updated at |

### Constraints

- ✅ UNIQUE(user_id) - One subscription per user
- ✅ CHECK plan_type IN ('free', 'premium', 'pro')
- ✅ CHECK status IN ('active', 'inactive', 'cancelled')

### Indexes

- `idx_subscriptions_user_id` - Fast lookups by user
- `idx_subscriptions_status` - Fast lookups by status

### RLS Policies

Users can only view their own subscription data:
```sql
SELECT * FROM subscriptions WHERE user_id = auth.uid();
```

Service role can manage all subscriptions:
```sql
-- Requires service_role key (admin operations)
```

## Deployment

### Step 1: Apply Migration
```bash
supabase migration up
```

Or manually in Supabase Dashboard:
- SQL Editor → Copy/paste migration file → Run

### Step 2: Verify
```bash
# Check table exists
SELECT * FROM subscriptions LIMIT 1;

# Check functions exist
SELECT proname FROM pg_proc WHERE proname = 'is_user_premium';
```

### Step 3: Rebuild Frontend
```bash
npm run build
# (already rebuilt by dev server)
```

## Testing

### Manual Test: View Premium Provider

1. In Supabase, create a test subscription:
```sql
INSERT INTO subscriptions (user_id, plan_type, status, started_at)
VALUES (
  'some-user-id'::UUID,
  'premium',
  'active',
  NOW()
);
```

2. Browse to provider in UI: `/browse/{user-id}`
3. Should see:
   - "Premium" badge with crown icon
   - "View Profile" button

### Test Premium Function
```sql
-- Check if user is premium
SELECT is_user_premium('user-id'::UUID);

-- Get subscription details
SELECT * FROM get_subscription_status('user-id'::UUID);
```

## API Usage

### From Frontend Code

**Check if user is premium**:
```typescript
const { data: isPremium } = await supabase
  .rpc('is_user_premium', { p_user_id: userId });
```

**Get subscription details**:
```typescript
const { data: subscription } = await supabase
  .rpc('get_subscription_status', { p_user_id: userId });
// Returns: { plan_type, status, is_active, expires_at }
```

### From Admin/Backend

```typescript
// Use service_role key for admin operations
const { data } = await supabaseAdmin
  .from('subscriptions')
  .insert({
    user_id: userId,
    plan_type: 'premium',
    status: 'active',
    started_at: new Date(),
  });
```

## Files Modified

```
supabase/
└── migrations/
    └── 20260417_add_premium_subscriptions.sql (NEW)

src/components/
└── BrowseDetail.tsx (UPDATED)
    ├── Added: Crown, User icons import
    ├── Added: isPremium, loadingPremium state
    ├── Added: useEffect to fetch premium status
    ├── Added: Premium badge display
    └── Added: "View Profile" button
```

## Next Steps (Optional)

1. **Subscription Management UI**
   - Add page to purchase/upgrade subscriptions
   - Show current plan status
   - Display renewal date

2. **Billing Integration**
   - Stripe/Paddle for payments
   - Auto-renewal logic
   - Invoice generation

3. **Premium Features**
   - Enhanced profile visibility
   - Priority booking
   - Analytics dashboard
   - Messaging system

4. **Admin Dashboard**
   - View all subscriptions
   - Manage plans
   - Monitor revenue

## Troubleshooting

### Premium Badge Not Showing

**Problem**: Premium user doesn't show badge

**Solution**:
1. Check subscription exists:
```sql
SELECT * FROM subscriptions WHERE user_id = 'user-id'::UUID;
```

2. Verify status and plan:
```sql
-- Should show: plan_type='premium'/'pro', status='active'
SELECT plan_type, status, expires_at FROM subscriptions 
WHERE user_id = 'user-id'::UUID;
```

3. Check function works:
```sql
SELECT is_user_premium('user-id'::UUID);
-- Should return: true
```

### "View Profile" Button Not Linking

**Problem**: Button clicked but no navigation

**Solution**:
1. Check provider.user_id exists
2. Verify profile route: `/profile/:slug` works
3. Check browser console for errors

---

**Ready to use!** Users can now have premium subscriptions and appear with badges. 🎉

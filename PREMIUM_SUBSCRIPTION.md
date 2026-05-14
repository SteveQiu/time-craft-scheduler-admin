# Premium Subscription Integration - Setup Guide

## Overview
In-app modal checkout using Lemon Squeezy, with real-time plan sync via Supabase.

## Components

### 1. Database
- **Table**: `orgs` (id, plan, created_at, updated_at)
- **Migration**: `20260513202047_create_orgs_table.sql`
- Each user profile is their own org (orgId = userId)

### 2. Frontend Components
- **PremiumUpgrade**: Button + modal trigger for Lemon.js checkout
- **useOrgPlan**: React hook for org plan state + real-time sync
- Integrated in: Dashboard (top-right header)

### 3. Lemon.js Integration
- Script loaded in `index.html` (defer)
- Checkout URL format: `https://{store-slug}.lemonsqueezy.com/checkout/buy/{variant-id}?checkout[custom][org_id]={orgId}`

### 4. Webhook
- Already implemented in `supabase/functions/lemonsqueezy-webhook/index.ts`
- Verifies HMAC-SHA256 signature
- Updates `orgs.plan` on subscription events
- Custom data: `{ org_id: userId }`

## Environment Variables

Required in `.env`:
```bash
VITE_LEMON_SQ_STORE_ID="your-store-slug"
VITE_LEMON_SQ_PRODUCT_ID="your-variant-id"
```

Get these from: https://app.lemonsqueezy.com

## Real-time Sync Flow

1. User clicks "Go Premium" → Opens Lemon.js modal
2. User completes payment → Lemon sends webhook
3. Webhook verifies signature → Updates `orgs.plan = 'premium'`
4. Supabase broadcasts change → Frontend updates via `useOrgPlan` hook
5. UI unlocks premium features immediately

## Premium Feature Gating

Example usage:
```tsx
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user } = useAuth();
  const { plan, loading } = useOrgPlan(user?.id || null);

  if (loading) return <Loader />;
  
  return (
    <>
      {plan === 'premium' && <PremiumFeature />}
      {plan === 'free' && <UpgradePrompt />}
    </>
  );
}
```

## Setup Checklist

- [x] Create `orgs` table migration
- [x] Update PremiumUpgrade component
- [x] Load Lemon.js script
- [x] Create useOrgPlan hook
- [x] Integrate into Dashboard
- [ ] Configure env vars (VITE_LEMON_SQ_STORE_ID, VITE_LEMON_SQ_PRODUCT_ID)
- [ ] Push migration: `supabase db push`
- [ ] Set webhook signing secret in Supabase Edge Function secrets
- [ ] Configure webhook URL in Lemon Squeezy dashboard

## Testing

1. Local dev: `npm run dev`
2. Click "Go Premium" in Dashboard
3. Modal should open with Lemon checkout
4. Complete test payment
5. Webhook fires → Plan updates → UI reflects change

## Notes

- Webhook signing secret: Set in Supabase project → Edge Functions → Secrets
- Lemon webhook URL: `https://{project-id}.supabase.co/functions/v1/lemonsqueezy-webhook`
- Store slug: Found in Lemon Squeezy URL (e.g., `your-store.lemonsqueezy.com`)
- Variant ID: Product variant ID from Lemon Squeezy dashboard

# lemonsqueezy-webhook

Supabase Edge Function that handles LemonSqueezy subscription webhooks and updates `orgs.plan`.

## Deploy

```bash
supabase functions deploy lemonsqueezy-webhook
```

## Set the signing secret

```bash
supabase secrets set LEMONSQUEEZY_SIGNING_SECRET=your_signing_secret_here
```

Get the signing secret from your LemonSqueezy store → Settings → Webhooks.

## Webhook URL

```
https://{project-ref}.supabase.co/functions/v1/lemonsqueezy-webhook
```

Replace `{project-ref}` with your Supabase project reference ID (e.g. `dbabjfydcllqbjpolhym`).

Configure this URL in LemonSqueezy → Store → Webhooks → Add webhook.

## Required events

Subscribe to these events in LemonSqueezy:

- `subscription_created`
- `subscription_updated`
- `subscription_cancelled`

## Passing org_id via custom_data

When creating a LemonSqueezy checkout session, pass `org_id` in `custom_data` so the webhook can identify which org to update:

```ts
const checkout = await lemonsqueezy.createCheckout({
  storeId: STORE_ID,
  variantId: VARIANT_ID,
  customData: {
    org_id: "your-org-uuid-here",
  },
});
```

LemonSqueezy forwards `custom_data` on every subscription event. Without `org_id`, the webhook returns 400 and no update is made.

## Plan values

| `orgs.plan` | Meaning            |
|-------------|--------------------|
| `free`      | No active sub      |
| `premium`   | Active subscription |

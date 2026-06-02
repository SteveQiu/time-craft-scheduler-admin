import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // 0. User-Agent pre-filter — defense-in-depth (not a security boundary; HMAC is)
  const userAgent = req.headers.get("User-Agent") ?? "";
  if (!userAgent.startsWith("LemonSqueezy")) {
    return new Response("Forbidden", { status: 403 });
  }

  // 1. Verify HMAC-SHA256 signature
  const secret = Deno.env.get("LEMON_SQUEEZY_WEBHOOK_SECRET") ?? "";
  const signature = req.headers.get("X-Signature") ?? "";
  const rawBody = await req.text();
  const hash = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (hash !== signature) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Parse event
  const event = JSON.parse(rawBody);
  const eventName: string = event.meta?.event_name ?? "";
  const attrs = event.data?.attributes ?? {};

  // H4: Block test webhooks by default — pass only if env explicitly set to "false"
  const blockTest = Deno.env.get("BLOCK_TEST_WEBHOOKS") !== "false";
  if (attrs.test_mode === true && blockTest) {
    console.log("Dropped test webhook (BLOCK_TEST_WEBHOOKS default-on)", { event: eventName, ls_id: event.data?.id });
    return new Response("OK", { status: 200 });
  }

  // 3. Extract org_id and user_id from custom_data
  const customData = event.meta?.custom_data ?? {};
  const orgId: string | undefined = customData.org_id;
  const userId: string | undefined = customData.user_id;

  if (!orgId) {
    console.warn("Webhook missing org_id in custom_data", { eventName });
    return new Response("Missing org_id in custom_data", { status: 400 });
  }

  // C3: Verify consistency — orgs.id === auth.users.id (1:1 mapping)
  if (userId && userId !== orgId) {
    console.warn("custom_data mismatch: org_id !== user_id — possible tampering", { orgId, userId, eventName });
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // H1: Idempotency — reject duplicate webhook_id to prevent replay attacks
  const webhookId: string | undefined = event.meta?.webhook_id;
  if (webhookId) {
    const { error: dupErr } = await supabase
      .from("processed_webhooks")
      .insert({ webhook_id: webhookId, event_name: eventName });
    if (dupErr) {
      // unique constraint violation = already processed
      console.log("Duplicate webhook ignored", { webhookId, eventName, code: dupErr.code });
      return new Response("OK", { status: 200 });
    }
  }

  // 4. Determine plan change
  let planType: "free" | "premium";
  let planStatus: "active" | "cancelled" | "inactive";

  if (
    (eventName === "subscription_created" ||
      eventName === "subscription_updated" ||
      eventName === "subscription_resumed" ||
      eventName === "subscription_unpaused") &&
    attrs.status === "active"
  ) {
    planType = "premium";
    planStatus = "active";
  } else if (
    eventName === "subscription_paused" ||
    attrs.status === "paused"
  ) {
    planType = "free";
    planStatus = "inactive";
  } else if (
    eventName === "subscription_cancelled" ||
    eventName === "subscription_expired" ||
    attrs.status === "cancelled" ||
    attrs.status === "expired" ||
    attrs.status === "past_due"
  ) {
    planType = "free";
    planStatus = "cancelled";
  } else {
    // M4: Log unhandled events instead of silently dropping
    console.log("Webhook event not actionable — no DB change", { eventName, status: attrs.status });
    return new Response("OK", { status: 200 });
  }

  // 5. Extract timestamps from LS payload
  const lsSubscriptionId: string | undefined = event.data?.id;
  const lsCustomerId: string | undefined = attrs.customer_id?.toString();
  const planStartedAt: string | undefined = attrs.created_at;
  // renews_at = next billing date for active; ends_at = cancellation effective date
  const planExpiresAt: string | undefined = attrs.renews_at ?? attrs.ends_at ?? undefined;
  const eventUpdatedAt: string | undefined = attrs.updated_at;

  // 6. Update org plan + subscription metadata
  const orgUpdate: Record<string, unknown> = {
    plan: planType,
    plan_status: planStatus,
    ...(lsSubscriptionId ? { ls_subscription_id: lsSubscriptionId } : {}),
    ...(lsCustomerId ? { ls_customer_id: lsCustomerId } : {}),
    ...(planStartedAt ? { plan_started_at: planStartedAt } : {}),
    ...(planExpiresAt ? { plan_expires_at: planExpiresAt } : {}),
  };

  // H2: Out-of-order rejection — skip if we've already applied a newer event
  if (eventUpdatedAt) {
    const { data: existingOrg } = await supabase
      .from("orgs")
      .select("ls_event_at")
      .eq("id", orgId)
      .maybeSingle();
    if (existingOrg?.ls_event_at && existingOrg.ls_event_at >= eventUpdatedAt) {
      console.log("Stale webhook ignored — existing event is newer", {
        webhookId, eventName,
        existing: existingOrg.ls_event_at,
        incoming: eventUpdatedAt,
      });
      return new Response("OK", { status: 200 });
    }
    orgUpdate.ls_event_at = eventUpdatedAt;
  }

  const { error: orgError } = await supabase
    .from("orgs")
    .update(orgUpdate)
    .eq("id", orgId);

  if (orgError) {
    console.error("Failed to update org:", orgError);
    return new Response("Internal Server Error", { status: 500 });
  }

  // 7. Upsert subscriptions table if user_id is available
  if (userId) {
    const subUpsert: Record<string, unknown> = {
      user_id: userId,
      plan_type: planType,
      status: planStatus === "active" ? "active" : planStatus === "cancelled" ? "cancelled" : "inactive",
      ...(planStartedAt ? { started_at: planStartedAt } : {}),
      ...(planExpiresAt ? { expires_at: planExpiresAt } : {}),
      updated_at: new Date().toISOString(),
    };

    const { error: subError } = await supabase
      .from("subscriptions")
      .upsert(subUpsert, { onConflict: "user_id" });

    if (subError) {
      console.error("Failed to upsert subscription:", subError);
      // Non-fatal — org already updated
    }
  }

  console.log(`org ${orgId} plan → ${planType} (event: ${eventName}, sub: ${lsSubscriptionId}, expires: ${planExpiresAt})`);

  return new Response("OK", { status: 200 });
});


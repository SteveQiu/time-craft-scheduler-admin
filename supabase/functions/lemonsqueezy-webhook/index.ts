import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
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

  // Block test webhooks if switch is enabled
  if (attrs.test_mode === true && Deno.env.get("BLOCK_TEST_WEBHOOKS") === "true") {
    return new Response("OK", { status: 200 });
  }

  // 3. Extract org_id and user_id from custom_data (lives under meta, not attrs)
  const customData = event.meta?.custom_data ?? {};
  const orgId: string | undefined = customData.org_id;
  const userId: string | undefined = customData.user_id;

  if (!orgId) {
    return new Response("Missing org_id in custom_data", { status: 400 });
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
    return new Response("OK", { status: 200 });
  }

  // 5. Extract timestamps from LS payload
  const lsSubscriptionId: string | undefined = event.data?.id;
  const lsCustomerId: string | undefined = attrs.customer_id?.toString();
  const planStartedAt: string | undefined = attrs.created_at;
  // renews_at = next billing date for active; ends_at = cancellation effective date
  const planExpiresAt: string | undefined = attrs.renews_at ?? attrs.ends_at ?? undefined;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 6. Update org plan + subscription metadata
  const orgUpdate: Record<string, unknown> = {
    plan: planType,
    plan_status: planStatus,
    ...(lsSubscriptionId ? { ls_subscription_id: lsSubscriptionId } : {}),
    ...(lsCustomerId ? { ls_customer_id: lsCustomerId } : {}),
    ...(planStartedAt ? { plan_started_at: planStartedAt } : {}),
    ...(planExpiresAt ? { plan_expires_at: planExpiresAt } : {}),
  };

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
      // Non-fatal — org already updated, log and continue
    }
  }

  console.log(`org ${orgId} plan → ${planType} (event: ${eventName}, sub: ${lsSubscriptionId}, expires: ${planExpiresAt})`);

  return new Response("OK", { status: 200 });
});

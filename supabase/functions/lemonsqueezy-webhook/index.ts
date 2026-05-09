import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // 1. Verify HMAC-SHA256 signature
  const secret = Deno.env.get("LEMONSQUEEZY_SIGNING_SECRET") ?? "";
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

  // 3. Determine plan change
  let newPlan: "free" | "premium" | null = null;

  if (
    (eventName === "subscription_created" || eventName === "subscription_updated") &&
    attrs.status === "active"
  ) {
    newPlan = "premium";
  } else if (
    eventName === "subscription_cancelled" ||
    attrs.status === "cancelled" ||
    attrs.status === "expired" ||
    attrs.status === "past_due"
  ) {
    newPlan = "free";
  } else {
    return new Response("OK", { status: 200 });
  }

  // 4. Extract org_id and/or user_id from custom_data
  const customData = event.meta?.custom_data ?? {};
  const orgId: string | undefined = customData.org_id;
  const userId: string | undefined = customData.user_id;

  if (!orgId && !userId) {
    return new Response("Missing org_id or user_id in custom_data", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 5. Update org plan if org_id present
  if (orgId) {
    const { error } = await supabase
      .from("orgs")
      .update({ plan: newPlan })
      .eq("id", orgId);

    if (error) {
      console.error("Failed to update org plan:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
    console.log(`org ${orgId} plan → ${newPlan} (event: ${eventName})`);
  }

  // 6. Upsert user subscription if user_id present
  if (userId) {
    const subscriptionData = newPlan === "premium"
      ? {
          user_id: userId,
          plan_type: "premium",
          status: "active",
          started_at: new Date().toISOString(),
        }
      : {
          user_id: userId,
          plan_type: "free",
          status: "cancelled",
        };

    const { error } = await supabase
      .from("subscriptions")
      .upsert(subscriptionData, { onConflict: "user_id" });

    if (error) {
      console.error("Failed to upsert user subscription:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
    console.log(`user ${userId} plan → ${newPlan} (event: ${eventName})`);
  }

  return new Response("OK", { status: 200 });
});

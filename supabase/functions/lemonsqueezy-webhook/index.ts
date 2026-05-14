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

  // 3. Extract org_id from custom_data
  const customData = attrs.custom_data ?? {};
  const orgId: string | undefined = customData.org_id;

  if (!orgId) {
    return new Response("Missing org_id in custom_data", { status: 400 });
  }

  // 4. Determine plan change
  let planType: "free" | "premium";
  let status: "active" | "cancelled";

  if (
    (eventName === "subscription_created" || eventName === "subscription_updated") &&
    attrs.status === "active"
  ) {
    planType = "premium";
    status = "active";
  } else if (
    eventName === "subscription_cancelled" ||
    attrs.status === "cancelled" ||
    attrs.status === "expired" ||
    attrs.status === "past_due"
  ) {
    planType = "free";
    status = "cancelled";
  } else {
    return new Response("OK", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 5. Update org plan
  const { error } = await supabase
    .from("orgs")
    .update({ plan: planType })
    .eq("id", orgId);

  if (error) {
    console.error("Failed to update org plan:", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  console.log(`org ${orgId} plan → ${planType} (event: ${eventName})`);

  return new Response("OK", { status: 200 });
});

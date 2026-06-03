import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_URL = Deno.env.get("APP_URL") ?? "https://pikappoint.lovable.app";
// Server-side only: test mode derived from ENVIRONMENT env var, never from client
const IS_TEST_ENV = (Deno.env.get("ENVIRONMENT") ?? "production") !== "production";

// M1: Lock CORS to APP_URL, not wildcard
const CORS = {
  "Access-Control-Allow-Origin": APP_URL,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  try {
    // C2: Verify JWT — reject anonymous/unauthenticated calls
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supaUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: { user }, error: authErr } = await supaUser.auth.getUser(token);
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // Parse body
    let reqBody: Record<string, unknown>;
    try {
      reqBody = await req.json();
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }
    const orgId = reqBody?.orgId as string | undefined;
    if (!orgId) return json({ error: "orgId required" }, 400);

    // C2: Authorize — caller must own this account (1:1 mapping)
    if (orgId !== user.id) return json({ error: "Forbidden" }, 403);

    // C1: Test mode derived server-side only (never trust client-supplied isTest)
    const isTest = IS_TEST_ENV;
    const liveApiKey = Deno.env.get("LEMON_SQUEEZY_API_KEY");
    const testApiKey = Deno.env.get("LEMON_SQ_TEST_API_KEY") ?? liveApiKey;
    const apiKey = isTest ? testApiKey : liveApiKey;
    const storeId = Deno.env.get("LEMON_SQ_STORE_ID");
    const prodVariantId = Deno.env.get("LEMON_SQ_VARIANT_ID");
    const testVariantId = Deno.env.get("LEMON_SQ_TEST_VARIANT_ID");

    // M2: Hard-fail if test mode active but test variant not configured
    if (isTest && !testVariantId) {
      console.error("LEMON_SQ_TEST_VARIANT_ID not set but ENVIRONMENT !== production");
      return json({ error: "Server misconfigured" }, 500);
    }

    const variantId = isTest ? testVariantId : prodVariantId;
    if (!apiKey || !storeId || !variantId) {
      console.error("Missing required env vars", { hasApiKey: !!apiKey, hasStoreId: !!storeId, hasVariantId: !!variantId });
      return json({ error: "Server misconfigured" }, 500);
    }

    // L3: userId and userEmail always from verified JWT, never from request body
    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: user.email,
            custom: { org_id: orgId, user_id: user.id },
          },
          product_options: { redirect_url: APP_URL },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    };

    const lsResp = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify(payload),
    });

    if (!lsResp.ok) {
      const errText = await lsResp.text();
      console.error("LemonSqueezy checkout error:", errText);
      // L1: never leak raw LS error to client
      return json({ error: "Checkout creation failed" }, 502);
    }

    // deno-lint-ignore no-explicit-any
    const lsData = await lsResp.json() as any;
    const url = lsData?.data?.attributes?.url as string | undefined;

    if (!url) {
      console.error("No URL in LemonSqueezy response:", JSON.stringify(lsData));
      // L2: never leak lsData to client
      return json({ error: "Checkout creation failed" }, 502);
    }

    return json({ url });
  } catch (err) {
    console.error("create-checkout unhandled:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS });
  }

  try {
    const rawBody = await req.text();
    const reqBody = JSON.parse(rawBody);
    const orgId: string = reqBody?.orgId;
    const userId: string | undefined = reqBody?.userId;
    const userEmail: string | undefined = reqBody?.userEmail;
    const isTest: boolean = reqBody?.isTest === true;

    const liveApiKey = Deno.env.get("LEMON_SQUEEZY_API_KEY");
    const testApiKey = Deno.env.get("LEMON_SQ_TEST_API_KEY") ?? liveApiKey;
    const apiKey = isTest ? testApiKey : liveApiKey;
    const storeId = Deno.env.get("LEMON_SQ_STORE_ID");
    const prodVariantId = Deno.env.get("LEMON_SQ_VARIANT_ID");
    const testVariantId = Deno.env.get("LEMON_SQ_TEST_VARIANT_ID");

    const variantId = (isTest && testVariantId) ? testVariantId : prodVariantId;

    if (!apiKey || !storeId || !prodVariantId) {
      return new Response(JSON.stringify({ error: "Server misconfigured", missing: { apiKey: !apiKey, storeId: !storeId, variantId: !prodVariantId } }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (!orgId) {
      return new Response(JSON.stringify({ error: "orgId required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            ...(userEmail ? { email: userEmail } : {}),
            custom: {
              org_id: orgId,
              ...(userId ? { user_id: userId } : {}),
            },
          },
          product_options: {
            redirect_url: Deno.env.get("APP_URL") ?? "https://pikappoint.lovable.app",
          },
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
      const err = await lsResp.text();
      console.error("LemonSqueezy error:", err);
      return new Response(JSON.stringify({ error: "Checkout creation failed", detail: err }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // deno-lint-ignore no-explicit-any
    const lsData = await lsResp.json() as any;
    const url = lsData?.data?.attributes?.url as string | undefined;

    if (!url) {
      return new Response(JSON.stringify({ error: "No URL in response", lsData }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout unhandled:", err);
    return new Response(JSON.stringify({ error: "Unhandled exception", message: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});

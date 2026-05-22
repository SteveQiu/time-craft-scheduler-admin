import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders })
  }

  // ✅ Require authentication — prevents open SMTP relay abuse
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace("Bearer ", "")
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { to, subject, appointmentTime } = await req.json()

    if (!to || !subject || typeof to !== "string" || typeof subject !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid required fields: to, subject" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const appointmentLine = typeof appointmentTime === "string" && appointmentTime.trim().length > 0
      ? `Your appointment is confirmed for <strong>${appointmentTime}</strong>.`
      : `Your appointment has been booked successfully.`

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2563eb;">📅 Appointment Confirmation</h2>
  <p>${appointmentLine}</p>
  <p>Thank you for booking with us!</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="font-size: 12px; color: #6b7280;">PikAppoint — your scheduling platform</p>
</body>
</html>`

    const text = typeof appointmentTime === "string" && appointmentTime.trim().length > 0
      ? `Your appointment is confirmed for ${appointmentTime}. Thank you for booking with us!`
      : `Your appointment has been booked successfully. Thank you for booking with us!`

    // Get SMTP credentials from environment
    const SMTP_HOST = Deno.env.get("SMTP_HOST")
    const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587")
    const SMTP_USER = Deno.env.get("SMTP_USER")
    const SMTP_PASS = Deno.env.get("SMTP_PASS")
    const SMTP_FROM = Deno.env.get("SMTP_FROM")

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      console.error("Missing SMTP configuration")
      return new Response(
        JSON.stringify({ error: "SMTP configuration incomplete" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { SmtpClient } = await import("https://deno.land/x/smtp@v0.16.0/mod.ts")
    const client = new SmtpClient()

    try {
      await client.connectTLS({
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        username: SMTP_USER,
        password: SMTP_PASS,
      })

      await client.send({
        from: SMTP_FROM,
        to: to,
        subject: subject,
        content: text || html,
        html: html,
      })

      await client.close()

      console.log(`Email sent successfully to ${to} by user ${claimsData.claims.sub}`)

      return new Response(
        JSON.stringify({ success: true, message: "Email sent successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    } catch (smtpError) {
      console.error("SMTP Error:", smtpError)
      try { await client.close() } catch { /* ignore */ }
      throw smtpError
    }
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

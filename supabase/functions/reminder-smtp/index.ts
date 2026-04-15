import "@supabase/functions-js/edge-runtime.d.ts"

// Import SMTP client for Deno
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

Deno.serve(async (req) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const { to, subject, html, text } = await req.json()

    // Validate required fields
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Get SMTP credentials from environment
    const SMTP_HOST = Deno.env.get("SMTP_HOST")
    const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587")
    const SMTP_USER = Deno.env.get("SMTP_USER")
    const SMTP_PASS = Deno.env.get("SMTP_PASS")
    const SMTP_FROM = Deno.env.get("SMTP_FROM")

    // Validate SMTP configuration
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      console.error("Missing SMTP configuration")
      return new Response(
        JSON.stringify({ error: "SMTP configuration incomplete" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Create SMTP client
    const client = new SmtpClient()

    // Connect to SMTP server (TLS connection)
    await client.connectTLS({
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      username: SMTP_USER,
      password: SMTP_PASS,
    })

    // Send email
    await client.send({
      from: SMTP_FROM,
      to: to,
      subject: subject,
      content: text || html || "Email from TimeCraft",
      html: html,
    })

    // Close connection
    await client.close()

    console.log(`Email sent successfully to ${to}`)

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("SMTP Error:", error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

/* To invoke locally:

  1. Set environment variables in supabase/.env.local:
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your-email@gmail.com
     SMTP_PASS=your-app-password
     SMTP_FROM="TimeCraft <your-email@gmail.com>"

  2. Run `supabase start`

  3. Test with curl:
     curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reminder-smtp' \
       --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
       --header 'Content-Type: application/json' \
       --data '{
         "to": "recipient@example.com",
         "subject": "Test Email",
         "html": "<h1>Hello from TimeCraft!</h1>",
         "text": "Hello from TimeCraft!"
       }'

*/

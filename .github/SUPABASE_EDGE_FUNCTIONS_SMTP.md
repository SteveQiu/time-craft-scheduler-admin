# Supabase Edge Functions + SMTP (Recommended)

## Why This Is Better Than Resend

| Factor | Resend | SMTP Edge Function |
|--------|--------|-------------------|
| **Cost** | $0 free tier | $0 (Supabase included) |
| **Email limit** | 100/day | 500/day (Gmail) |
| **Third-party** | Yes (Resend) | No (just SMTP) |
| **Setup time** | 5 min | 10 min |
| **Scalability** | Upgrade to paid | Free forever (500/day) |
| **Credentials** | Stored safely | Stored in Supabase secrets |

**You're right:** SMTP Edge Function is the better choice.

---

## Complete Implementation

### Step 1: Create Supabase Edge Function

Create file: `supabase/functions/send-email/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Simple SMTP implementation using Deno's built-in capabilities
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const { to, subject, html, text } = await req.json()

  // Get credentials from Supabase secrets
  const SMTP_HOST = Deno.env.get("SMTP_HOST")
  const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587")
  const SMTP_USER = Deno.env.get("SMTP_USER")
  const SMTP_PASS = Deno.env.get("SMTP_PASS")
  const SMTP_FROM = Deno.env.get("SMTP_FROM")

  try {
    // Using npm import (works in Supabase Edge Functions)
    const { SmtpClient } = await import("https://deno.land/x/smtp@v0.7.0/mod.ts")

    const client = new SmtpClient()

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

    return new Response(
      JSON.stringify({ success: true, message: "Email sent" }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("SMTP Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

---

### Step 2: Set Up Gmail SMTP

1. **Create dedicated Gmail account** (or use existing)
   - Email: `timecraft.bookings@gmail.com`
   - Password: Store in .secret file temporarily

2. **Enable Gmail App Password**
   ```
   Go to: myaccount.google.com/apppasswords
   Select: Mail → Windows Computer
   Copy the 16-character password
   ```

3. **Store in .secret file** (not committed to git)
   ```
   GMAIL_USER=timecraft.bookings@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

---

### Step 3: Add Secrets to Supabase

Run in terminal:

```bash
# Login to Supabase CLI
supabase login

# Set secrets for your project
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=timecraft.bookings@gmail.com
supabase secrets set SMTP_PASS="xxxx xxxx xxxx xxxx"
supabase secrets set SMTP_FROM="TimeCraft <timecraft.bookings@gmail.com>"
```

Verify secrets are set:
```bash
supabase secrets list
```

---

### Step 4: Call from React Component

In `src/components/BookingBrowse.tsx` (after booking succeeds):

```typescript
import { supabase } from '../lib/supabase'

// After successful booking...
async function sendBookingConfirmation(email: string, appointment: any) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: 'Your Appointment is Confirmed! 📅',
        html: `
          <h2>Booking Confirmed</h2>
          <p>Your appointment has been confirmed!</p>
          <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${appointment.time}</p>
          <p><strong>Business:</strong> ${appointment.businessName}</p>
          <p>Thank you for booking with us!</p>
        `,
        text: `Your appointment on ${appointment.date} at ${appointment.time} is confirmed.`
      }
    })

    if (error) {
      console.error('Email send failed:', error)
      return false
    }

    console.log('Email sent successfully')
    return true
  } catch (error) {
    console.error('Error calling send-email function:', error)
    return false
  }
}

// In your booking handler:
const { data, error } = await supabase.rpc('book_opening', {
  opening_id: selectedOpening.id,
  guest_email: userEmail,
  guest_name: userName
})

if (!error) {
  // Booking succeeded, now send email
  await sendBookingConfirmation(userEmail, {
    date: selectedOpening.date,
    time: selectedOpening.time,
    businessName: business.name
  })
}
```

---

### Step 5: Deploy Edge Function

```bash
# Deploy to Supabase
supabase functions deploy send-email

# Test locally (optional)
supabase functions serve
```

---

## Why SMTP with Edge Functions Wins

✅ **$0 cost** - Gmail free tier (500/day)
✅ **No third-party service** - Just SMTP
✅ **Higher limits** - 500/day vs 100/day
✅ **Integrated** - Uses Supabase you already have
✅ **Professional** - Looks like official emails
✅ **Credentials secure** - Stored in Supabase secrets
✅ **Easy to scale** - Just increase email limit if needed
✅ **Works forever** - Gmail limits never hit for small business

---

## Testing Your Email Function

1. **Local test** (if using `supabase functions serve`):
```bash
curl -X POST http://localhost:54321/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-test-email@gmail.com",
    "subject": "Test Email",
    "html": "<h1>Hello!</h1>",
    "text": "Hello!"
  }'
```

2. **Production test** (after deploy):
   - Make a real booking
   - Check email inbox for confirmation

3. **Verify email came from your account**:
   - Should show: `From: TimeCraft <timecraft.bookings@gmail.com>`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not sending | Check Gmail app password is correct (with spaces!) |
| "Connection refused" | Verify SMTP_HOST=smtp.gmail.com and SMTP_PORT=587 |
| "Invalid credentials" | Regenerate Gmail app password |
| "Function timeout" | SMTP taking too long; increase timeout in Supabase settings |

---

## Cost Summary

| Item | Cost | Notes |
|------|------|-------|
| Gmail account | $0 | Free forever |
| Gmail SMTP (500/day) | $0 | Included with Gmail |
| Supabase Edge Functions | $0 | Included in free tier |
| **Total** | **$0/month** | Works forever at this scale |

**At 50 bookings/day = 50 emails/day**
- Gmail limit: 500/day ✅ Safe for 10x growth
- Cost: $0/month
- Revenue: Starts Month 2

---

## What You Get

After 15 minutes:
- ✅ Email confirmations sent automatically
- ✅ No third-party service
- ✅ Professional email (from your business)
- ✅ $0 cost, scales to 500/day free
- ✅ All credentials secure in Supabase

**This is the right approach for your project.**

# Supabase Edge Function Setup - reminder-smtp

## What We Created

✅ **Supabase Edge Function:** `supabase/functions/reminder-smtp/`
- Deno-based serverless function
- SMTP email sending capability
- Runs on Supabase's global edge network
- **Cost:** $0 (included in free tier)

---

## Setup Steps

### 1. Create Dedicated Gmail Account (If Not Done)

Create a new Gmail account for your application:
- Email: `timecraft.bookings@gmail.com`
- Keep credentials in `.secret` file (not committed to git)

### 2. Generate Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select: **Mail** → **Windows Computer**
3. Google will generate a 16-character password with spaces
4. Copy it (including spaces)

### 3. Store Credentials in `.secret` File

Edit your `.secret` file (already in `.gitignore`):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=timecraft.bookings@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM="TimeCraft <timecraft.bookings@gmail.com>"
```

**CRITICAL:** Keep spaces in `SMTP_PASS` exactly as provided by Gmail.

### 4. Add Secrets to Local Development

For local testing with `supabase start`, create `supabase/.env.local`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=timecraft.bookings@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM="TimeCraft <timecraft.bookings@gmail.com>"
```

### 5. Deploy Secrets to Production

Once you're ready to deploy, add secrets to Supabase project:

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref [YOUR_PROJECT_ID]

# Set secrets
npx supabase secrets set SMTP_HOST=smtp.gmail.com
npx supabase secrets set SMTP_PORT=587
npx supabase secrets set SMTP_USER=timecraft.bookings@gmail.com
npx supabase secrets set SMTP_PASS="xxxx xxxx xxxx xxxx"
npx supabase secrets set SMTP_FROM="TimeCraft <timecraft.bookings@gmail.com>"

# Verify secrets are set
npx supabase secrets list
```

---

## Testing Locally

### Start Supabase Services

```bash
npx supabase start
```

This starts:
- Local PostgreSQL database
- Supabase Auth server
- Functions runtime
- All at `http://localhost:54321`

### Test the Function

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reminder-smtp' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "to": "your-test-email@gmail.com",
    "subject": "TimeCraft Test Email",
    "html": "<h1>Hello!</h1><p>This is a test from TimeCraft.</p>",
    "text": "Hello! This is a test from TimeCraft."
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

Check your test email inbox for the message.

---

## Deploy to Production

Once tested locally and working:

```bash
# Deploy the function to production
npx supabase functions deploy reminder-smtp
```

Verify deployment:
```bash
npx supabase functions list
```

---

## Call from React Component

In `src/components/BookingBrowse.tsx` (after successful booking):

```typescript
import { supabase } from '../lib/supabase'

async function sendBookingConfirmation(
  email: string,
  appointment: {
    date: string
    time: string
    businessName: string
  }
) {
  try {
    const { data, error } = await supabase.functions.invoke('reminder-smtp', {
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

    console.log('Booking confirmation email sent')
    return true
  } catch (error) {
    console.error('Error calling reminder-smtp function:', error)
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
  // Booking succeeded, send confirmation email
  await sendBookingConfirmation(userEmail, {
    date: selectedOpening.date,
    time: selectedOpening.time,
    businessName: business.name
  })
}
```

---

## Function Details

**Location:** `supabase/functions/reminder-smtp/index.ts`

**Accepts:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<h1>HTML Content</h1>",
  "text": "Plain text fallback"
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

**Error Responses:**
- `400` - Missing required fields (to, subject)
- `500` - SMTP configuration incomplete or connection failed

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid credentials" | Verify SMTP_PASS has spaces (from Gmail) |
| "Connection refused" | Check SMTP_HOST=smtp.gmail.com and SMTP_PORT=587 |
| "Function timeout" | Gmail SMTP may be slow; function times out after 60s |
| Email not received | Check spam/promotions folder; verify recipient email |
| "SMTP_USER not set" | Ensure .env.local exists and is loaded |

---

## Gmail SMTP Limits

- **Daily limit:** 500 emails/day
- **At 50 bookings/day:** Uses 100 emails/day (5x safe margin)
- **Cost:** $0 forever
- **No upgrade needed** until you reach 500/day limit

---

## Next Steps

1. ✅ Create Supabase Edge Function
2. ⏳ Get Gmail app password
3. ⏳ Add credentials to `.secret` and `supabase/.env.local`
4. ⏳ Test locally with curl
5. ⏳ Integrate with BookingBrowse component
6. ⏳ Deploy to production
7. ⏳ Test with real bookings

---

## Files Created

- `supabase/functions/reminder-smtp/index.ts` - Main function code
- `supabase/functions/reminder-smtp/deno.json` - Deno config
- `supabase/functions/reminder-smtp/.npmrc` - NPM config

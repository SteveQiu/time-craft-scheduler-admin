# Deploy reminder-smtp to Production (Skip Local Testing)

## Why Skip Local Testing?

Local testing requires all Supabase services (Docker containers). Docker registry rate-limiting makes this unreliable. **Deploying to production is faster and cleaner.**

---

## Step 1: Login to Supabase

```bash
npx supabase login
```

This opens your browser to authenticate. Complete the login.

---

## Step 2: Find Your Project ID

```bash
npx supabase projects list
```

Find your project and copy the project ID (looks like: `abc123def456`)

---

## Step 3: Link Your Project

```bash
npx supabase link --project-ref YOUR_PROJECT_ID
```

Replace `YOUR_PROJECT_ID` with your actual ID.

---

## Step 4: Set Production Secrets

```bash
npx supabase secrets set SMTP_HOST=smtp.gmail.com
npx supabase secrets set SMTP_PORT=587
npx supabase secrets set SMTP_USER=YOUR_EMAIL@gmail.com
npx supabase secrets set SMTP_PASS=YOUR_APP_PASSWORD
npx supabase secrets set SMTP_FROM="Your Business <YOUR_EMAIL@gmail.com>"
```

Verify:
```bash
npx supabase secrets list
```

---

## Step 5: Deploy the Function

```bash
npx supabase functions deploy reminder-smtp
```

This deploys to production. Check for success message.

---

## Step 6: Test in Production

Get your anon key from Supabase dashboard, then:

```bash
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/reminder-smtp' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"to":"your-email@example.com","subject":"Test Email","html":"<h1>Hello from Production!</h1>","text":"Hello!"}'
```

Check your email inbox for the test message.

---

## Step 7: Call from React

In your React component after booking:

```typescript
import { supabase } from '../lib/supabase'

async function sendBookingEmail(email: string, bookingDetails: any) {
  const { data, error } = await supabase.functions.invoke('reminder-smtp', {
    body: {
      to: email,
      subject: 'Your Appointment Confirmed! 📅',
      html: `
        <h2>Booking Confirmed</h2>
        <p>Your appointment on <strong>${bookingDetails.date}</strong> at <strong>${bookingDetails.time}</strong> is confirmed!</p>
        <p>Thank you for booking with us!</p>
      `,
      text: `Your appointment on ${bookingDetails.date} is confirmed.`
    }
  })

  if (error) {
    console.error('Failed to send email:', error)
    return false
  }

  console.log('Confirmation email sent')
  return true
}

// Use it in your booking handler
const { data, error } = await supabase.rpc('book_opening', { ... })
if (!error) {
  await sendBookingEmail(userEmail, bookingDetails)
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Project not linked" | Run `npx supabase link --project-ref YOUR_ID` |
| "Invalid credentials" | Verify SMTP_PASS has no extra spaces |
| "Function timeout" | Check Gmail logs at myaccount.google.com/security |
| "Email not received" | Check spam folder or test with admin email |

---

## That's it!

Once deployed, the function is live and your React app can call it immediately.

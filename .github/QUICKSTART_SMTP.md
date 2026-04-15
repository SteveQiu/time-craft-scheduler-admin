# Quick Setup - reminder-smtp Function

## Created ✅

**Edge Function:** `supabase/functions/reminder-smtp/`
- Deno-based SMTP email sender
- Runs serverless on Supabase
- **Cost:** $0

---

## Step 1: Gmail App Password (5 min)

1. Go to: https://myaccount.google.com/apppasswords
2. Select: **Mail** → **Windows Computer**
3. Copy 16-char password (with spaces!)

---

## Step 2: Store Credentials (1 min)

Edit `.secret` file (already in .gitignore):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=timecraft.bookings@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM="TimeCraft <timecraft.bookings@gmail.com>"
```

---

## Step 3: Test Locally (5 min)

Create `supabase/.env.local` with same values ↑

```bash
npx supabase start
```

Test in new terminal:
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reminder-smtp' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{"to":"your-email@gmail.com","subject":"Test","html":"<h1>Hello!</h1>","text":"Hello!"}'
```

Should see: `{"success": true, "message": "Email sent successfully"}`

---

## Step 4: Deploy to Production

Get your Supabase project ID:
```bash
npx supabase projects list
```

Link to your project:
```bash
npx supabase link --project-ref YOUR_PROJECT_ID
```

Set production secrets:
```bash
npx supabase secrets set SMTP_HOST=smtp.gmail.com
npx supabase secrets set SMTP_PORT=587
npx supabase secrets set SMTP_USER=timecraft.bookings@gmail.com
npx supabase secrets set SMTP_PASS="xxxx xxxx xxxx xxxx"
npx supabase secrets set SMTP_FROM="TimeCraft <timecraft.bookings@gmail.com>"
```

Deploy:
```bash
npx supabase functions deploy reminder-smtp
```

---

## Step 5: Use in React

After booking succeeds:

```typescript
const { data, error } = await supabase.functions.invoke('reminder-smtp', {
  body: {
    to: email,
    subject: 'Your Appointment is Confirmed! 📅',
    html: `<h2>Booking Confirmed</h2><p>Your appointment on ${date} at ${time}</p>`,
    text: `Your appointment on ${date} at ${time}`
  }
})
```

---

## Limits

- **Gmail:** 500 emails/day free
- **Your usage:** ~50 emails/day (50 bookings)
- **Safety margin:** 10x
- **Cost:** $0 forever

---

See full details: `.github/EDGE_FUNCTION_SETUP.md`

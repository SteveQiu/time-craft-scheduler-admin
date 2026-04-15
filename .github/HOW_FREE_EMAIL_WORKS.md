# Free Email Confirmations - How It Works

## Free Email Services (Why They Exist)

Free email services make money by:
1. **Upselling** - Free tier gets you hooked, then you pay for higher volume
2. **Data** - They see your customers' emails (not personally identifying, aggregate data)
3. **Building market share** - Cheap/free to get market dominance

**For you:** Use free tier forever if you keep volume under the limit.

---

## Best Free Email Options

### 1. **Resend** (EASIEST - Recommended)
- **Free:** 100 emails/day
- **Setup:** 5 minutes
- **Cost:** $0 unless you exceed 100/day

```bash
npm install resend
```

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendBookingConfirmation(email, appointment) {
  await resend.emails.send({
    from: 'noreply@timecraft.app',
    to: email,
    subject: 'Booking Confirmed!',
    html: `
      <h2>Your appointment is confirmed</h2>
      <p>Date: ${appointment.date}</p>
      <p>Time: ${appointment.start_time}</p>
      <p>Provider: ${appointment.provider_name}</p>
    `
  });
}
```

**Pros:**
- ✅ Super easy API
- ✅ 100/day free
- ✅ Good documentation
- ✅ Free tier is generous

**Cons:**
- Need own domain email (or use provided)

---

### 2. **SendGrid** (ALSO EASY)
- **Free:** 100 emails/day
- **Setup:** 10 minutes
- **Cost:** $0 unless you exceed 100/day

```typescript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendBookingConfirmation(email, appointment) {
  await sgMail.send({
    to: email,
    from: 'noreply@timecraft.app',
    subject: 'Booking Confirmed!',
    html: `<h2>Your appointment is confirmed</h2>...`
  });
}
```

**Pros:**
- ✅ 100/day free
- ✅ Battle-tested (used by millions)
- ✅ Good deliverability

**Cons:**
- Slightly more setup
- Requires API key management

---

### 3. **Mailgun** (ADVANCED)
- **Free:** 100/day (or just pay small amount)
- **Setup:** 15 minutes
- **Cost:** $0 or $5/month for unlimited

```typescript
import mailgun from 'mailgun.js';

const mg = new mailgun.Mailgun({ apiKey: process.env.MAILGUN_API_KEY });
const client = mg.client();

async function sendBookingConfirmation(email, appointment) {
  await client.messages.create('timecraft.app', {
    from: 'noreply@timecraft.app',
    to: email,
    subject: 'Booking Confirmed!',
    html: `<h2>Your appointment is confirmed</h2>...`
  });
}
```

**Pros:**
- ✅ Very flexible
- ✅ Lowest cost at scale ($5/month)
- ✅ Good for developers

**Cons:**
- Most complex setup
- Requires domain verification

---

## Easiest Path: Resend (Do This)

### Step 1: Sign Up (2 minutes)
1. Go to https://resend.com
2. Click "Sign Up"
3. Use GitHub login (fastest)
4. Verify email

### Step 2: Get API Key (2 minutes)
1. Dashboard → API Keys
2. Copy API key
3. Add to `.env`:
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Step 3: Install Package (1 minute)
```bash
npm install resend
```

### Step 4: Add Email Function (5 minutes)

In your booking code:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function handleBooking(opening_id, user_id, user_email) {
  try {
    // 1. Book the appointment (existing code)
    const { data, error } = await supabase.rpc('book_opening', {
      _opening_id: opening_id,
      _user_id: user_id
    });

    if (error) throw error;

    // 2. Get appointment details
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', data)
      .single();

    // 3. Send confirmation email
    await resend.emails.send({
      from: 'noreply@timecraft.app',
      to: user_email,
      subject: '✅ Booking Confirmed!',
      html: `
        <h2>Your appointment is confirmed</h2>
        <hr>
        <p><strong>Service:</strong> ${appointment.service}</p>
        <p><strong>Provider:</strong> ${appointment.provider_id}</p>
        <p><strong>Date:</strong> ${appointment.date}</p>
        <p><strong>Time:</strong> ${appointment.start_time}</p>
        <p><strong>Duration:</strong> ${appointment.duration} minutes</p>
        <p><strong>Location:</strong> ${appointment.location}</p>
        <hr>
        <p>See you then!</p>
      `
    });

    // 4. Show success
    toast.success('Booking confirmed! Check your email.');
    
  } catch (error) {
    console.error('Error:', error);
    toast.error('Booking failed');
  }
}
```

---

## Where to Add This (In Your Code)

Currently in `src/components/BookingBrowse.tsx` line 178:

```typescript
// BEFORE (current code)
const { data, error } = await supabase.rpc('book_opening', {
  _opening_id: selectedSlot.id,
  _user_id: (await supabase.auth.getUser()).data.user?.id
});

// AFTER (with email)
const currentUser = (await supabase.auth.getUser()).data.user;

const { data, error } = await supabase.rpc('book_opening', {
  _opening_id: selectedSlot.id,
  _user_id: currentUser?.id
});

if (!error) {
  // Send confirmation email
  const { data: appointment } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', data)
    .single();

  await fetch('/api/send-email', {
    method: 'POST',
    body: JSON.stringify({
      email: currentUser?.email,
      appointment: appointment
    })
  });

  toast.success('Booking confirmed! Check your email.');
}
```

---

## Cost Breakdown

| Service | Free Limit | Cost After |
|---------|-----------|-----------|
| **Resend** | 100/day | $20/month for 10k/month |
| **SendGrid** | 100/day | $10-300/month (pay as you grow) |
| **Mailgun** | 100/day | $5/month for unlimited |

**For you:**
- 50 bookings/day = 50 emails/day (under 100) = **FOREVER FREE**
- 150 bookings/day = 150 emails/day (over 100) = **Pay $5-20/month**

---

## Why This Is Free

1. **No infrastructure cost for you:**
   - They handle email servers
   - They handle deliverability
   - They handle bounce management

2. **They make money because:**
   - Most small businesses don't exceed free tier
   - Those who do upgrade (they convert 5-10%)
   - Your data in aggregate is valuable

3. **You benefit because:**
   - Free tier covers most small businesses indefinitely
   - Only pay if you succeed and grow
   - Pay-as-you-go, no contracts

---

## Total Setup Time: 15 Minutes

1. Sign up (2 min)
2. Get API key (2 min)
3. npm install (1 min)
4. Add environment variable (2 min)
5. Write email function (5 min)
6. Test one email (3 min)

**That's it. No server costs. Emails send in seconds.**

---

## Next: Where to Add Resend

Add this to `BookingBrowse.tsx`:

```typescript
// After successful booking
import { Resend } from 'resend';

const resend = new Resend(process.env.VITE_RESEND_API_KEY);

const sendConfirmation = async (email, appointment) => {
  try {
    await resend.emails.send({
      from: 'noreply@timecraft.app',
      to: email,
      subject: '✅ Booking Confirmed!',
      html: `Your appointment on ${appointment.date} at ${appointment.start_time} is confirmed!`
    });
  } catch (err) {
    console.error('Email failed (non-blocking):', err);
  }
};
```

Call it after booking succeeds.

**Done. Free email confirmations.**

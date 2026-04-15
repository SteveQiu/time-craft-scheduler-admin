# Free Email via SMTP - Even Better Than Resend

## Best Option: SMTP is Actually Cheaper

SMTP (Simple Mail Transfer Protocol) lets you send emails directly without third-party APIs.

**Cost: $0** (if you use Gmail/Outlook you already have)

---

## SMTP Options

### 1. **Gmail SMTP** (FREE - Easiest)
- **Cost:** $0
- **Limit:** 500 emails/day
- **Setup:** 5 minutes
- **Reliability:** Excellent (Google infrastructure)

### 2. **Outlook SMTP** (FREE)
- **Cost:** $0
- **Limit:** 300 emails/day
- **Setup:** 5 minutes
- **Reliability:** Good

### 3. **Custom Domain Email** (Optional)
- **Cost:** $1-10/month for domain
- **Setup:** 20 minutes
- **Limit:** Depends on provider
- **Professionalism:** High (branded emails)

---

## Easiest: Gmail SMTP

### Step 1: Enable App Password (5 minutes)

1. Go to https://myaccount.google.com/
2. Click **Security** (left sidebar)
3. Find **App passwords** (if you have 2FA enabled)
   - If not, enable 2FA first (2 minutes)
4. Select **Mail** and **Windows Computer**
5. Google will generate a 16-character password
6. **Copy this password** (this is your SMTP password)

### Step 2: Add to .secret

```
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

### Step 3: Send Email via SMTP

```typescript
// src/api/send-email.ts
import nodemailer from 'nodemailer';
import fs from 'fs';

function getSecrets() {
  const content = fs.readFileSync('.secret', 'utf-8');
  const secrets: Record<string, string> = {};
  
  content.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('=')) {
      const [k, ...v] = line.split('=');
      secrets[k.trim()] = v.join('=').trim();
    }
  });
  
  return secrets;
}

// Create transporter once
let transporter: any = null;

function getTransporter() {
  if (transporter) return transporter;
  
  const { GMAIL_USER, GMAIL_PASSWORD } = getSecrets();
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASSWORD // 16-char app password, no spaces
    }
  });
  
  return transporter;
}

export async function POST(req: Request) {
  try {
    const { email, appointment } = await req.json();
    const transporter = getTransporter();
    
    const result = await transporter.sendMail({
      from: `TimeCraft <${getSecrets().GMAIL_USER}>`,
      to: email,
      subject: '✅ Booking Confirmed!',
      html: `
        <h2>Booking Confirmed!</h2>
        <p><strong>Date:</strong> ${appointment.date}</p>
        <p><strong>Time:</strong> ${appointment.start_time}</p>
        <p><strong>Service:</strong> ${appointment.service}</p>
        <p>See you soon!</p>
      `
    });
    
    return Response.json({ success: true, id: result.messageId });
  } catch (error: any) {
    console.error('Email failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 4: Install Package

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### Step 5: Call from Frontend (Same as Before)

```typescript
// In BookingBrowse.tsx after booking
await fetch('/api/send-email', {
  method: 'POST',
  body: JSON.stringify({
    email: currentUser?.email,
    appointment
  })
});
```

---

## Complete Setup (10 minutes total)

| Step | Time | What |
|------|------|------|
| Enable App Password | 3 min | Gmail settings |
| Add to .secret | 2 min | Copy 16-char password |
| npm install nodemailer | 2 min | Install package |
| Create API route | 3 min | Send email function |
| **Total** | **10 min** | **Done** |

---

## Why SMTP is Better Than Resend

| Factor | Resend | Gmail SMTP |
|--------|--------|-----------|
| **Cost** | $0 (free tier) | $0 (always) |
| **Limit** | 100/day | 500/day |
| **Setup** | 10 min | 5 min |
| **Reliability** | Good | Excellent |
| **Sender** | generic@resend.com | your@gmail.com |
| **Brand** | Generic | Personalized |
| **No API Key** | Need one | Use Gmail |

**Winner: Gmail SMTP for $0 and more flexibility**

---

## .secret File (Updated)

```
SUPABASE_KEY=pk_live_xxxxx
SUPABASE_URL=https://xxxxx.supabase.co
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

---

## Bonus: Custom Domain Email (Optional Later)

If you want branded emails like "noreply@timecraft.app":

1. Buy domain ($5-10/year)
2. Use email hosting like Zoho Mail ($0-5/month)
3. Point MX records to email provider
4. Set up SMTP with that email

**But for MVP:** Just use your Gmail. Customers trust it more anyway.

---

## Limits & When to Upgrade

| Scale | Solution | Cost |
|-------|----------|------|
| 0-100 bookings/day | Gmail SMTP | $0 |
| 100-500/day | Gmail + backup (Outlook) | $0 |
| 500+ bookings/day | Mailgun or SendGrid | $5-20/month |

**You can use Gmail for free until you hit 500+ emails/day.**

---

## Security (Important)

### ✅ Safe
- App password is special (limited access)
- Can't be used for login
- Can be revoked anytime
- Different from Gmail password

### ❌ Never Do This
- Don't use your main Gmail password
- Don't commit .secret to git
- Don't log credentials

---

## Total Cost: $0 Forever

**Using Gmail SMTP:**
- Setup: $0
- Monthly: $0
- Per email: $0
- Limit: 500/day
- Your payoff: All revenue

---

## Implementation Plan

1. **Enable Gmail App Password** (3 min)
2. **Add to .secret** (2 min)
3. **npm install nodemailer** (2 min)
4. **Create /api/send-email.ts** (5 min)
5. **Update BookingBrowse.tsx** (2 min)
6. **Test with one booking** (2 min)

**Total: 16 minutes. Cost: $0.**

Ready to implement?

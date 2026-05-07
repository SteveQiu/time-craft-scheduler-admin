# Dedicated Gmail/Outlook for SMTP - Best Practice

## Why Dedicated Email is Better

| Aspect | Personal Gmail | Dedicated Gmail |
|--------|----------------|-----------------|
| **Professionalism** | "From: john@gmail.com" | "From: noreply@timecraft.app" |
| **Reputation** | Mixed with personal | Fresh, clean reputation |
| **Limit** | 500/day | 500/day (same) |
| **Control** | Shared with personal | Isolated for business |
| **Recovery** | You need access | Company owns account |
| **Cost** | $0 | $0 |
| **Setup** | 5 min | 10 min |

**Recommendation:** Use dedicated Gmail. Professional + isolated.

---

## Option 1: Dedicated Gmail Account (EASIEST)

### Step 1: Create New Gmail (2 minutes)

1. Go to https://accounts.google.com/signup
2. First name: "PikAppoint"
3. Last name: "Noreply" (or whatever you want)
4. Choose email: **noreply@gmail.com** (will be noreply+random@gmail.com)
5. Password: Make strong (save in .secret file)
6. Complete signup

**Or:** Use existing Gmail you have, just dedicate it to this purpose.

### Step 2: Enable App Password (3 minutes)

1. Log into the new dedicated Gmail
2. Go to https://myaccount.google.com/security
3. **Enable 2-Step Verification** first if not enabled
4. Go back to Security
5. Find **App passwords**
6. Select **Mail** → **Windows Computer** (or your OS)
7. Google generates 16-char password
8. **Copy** (without spaces)

### Step 3: Add to .secret

```
GMAIL_USER=noreply@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
GMAIL_DISPLAY_NAME=PikAppoint Bookings

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

let transporter: any = null;

function getTransporter() {
  if (transporter) return transporter;
  
  const { GMAIL_USER, GMAIL_PASSWORD } = getSecrets();
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASSWORD
    }
  });
  
  return transporter;
}

export async function POST(req: Request) {
  try {
    const { email, appointment } = await req.json();
    const { GMAIL_DISPLAY_NAME, GMAIL_USER } = getSecrets();
    const transporter = getTransporter();
    
    await transporter.sendMail({
      from: `${GMAIL_DISPLAY_NAME} <${GMAIL_USER}>`,
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
    
    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Email failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Option 2: Outlook/Hotmail (Similar Cost, Similar Setup)

### Step 1: Create New Outlook

1. Go to https://outlook.live.com
2. Click "Create free account"
3. Email: **noreply@outlook.com** or **noreply@yourdomain.com**
4. Password: Strong

### Step 2: Enable App Password

1. Go to https://account.microsoft.com/security
2. Find **App passwords**
3. Microsoft generates password
4. Copy to .secret

### Step 3: Use in Code

```typescript
// Same as Gmail, just different service
const transporter = nodemailer.createTransport({
  service: 'outlook', // Changed from 'gmail'
  auth: {
    user: OUTLOOK_USER,
    pass: OUTLOOK_PASSWORD
  }
});
```

---

## Complete .secret File

```
# Supabase
SUPABASE_KEY=pk_live_xxxxx
SUPABASE_URL=https://xxxxx.supabase.co

# Dedicated Email (Gmail)
GMAIL_USER=noreply@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
GMAIL_DISPLAY_NAME=PikAppoint Bookings
# OUTLOOK_USER=noreply@outlook.com
# OUTLOOK_PASSWORD=xxxx xxxx xxxx xxxx
```

---

## Benefits of Dedicated Account

### Professional
- Emails show "From: PikAppoint Noreply" (not personal name)
- Customers see it as a service email
- Looks legitimate

### Isolated
- Your business email separate from personal
- If account compromised, doesn't affect personal Gmail
- Can share access with team later

### Scalable
- Can migrate to another provider later
- Account ownership is clear
- No personal data tied to it

### Cost
- **$0** (Gmail/Outlook free tier)
- **Forever free** up to 500 emails/day
- No payment needed

---

## Setup Summary (Dedicated Gmail)

| Step | Time | Action |
|------|------|--------|
| Create Gmail account | 2 min | signup.google.com |
| Enable 2FA + App Password | 3 min | myaccount.google.com/security |
| Add to .secret | 2 min | Copy credentials |
| npm install nodemailer | 2 min | Install package |
| Create /api/send-email.ts | 5 min | SMTP code |
| Test | 2 min | Send one email |
| **Total** | **16 min** | **Done** |

---

## Emails You'll Send

```
From: PikAppoint Bookings <noreply@gmail.com>
To: customer@example.com
Subject: ✅ Booking Confirmed!
```

**Looks professional and trustworthy.**

---

## Backup: Use Outlook Too

If Gmail hits 500/day limit (unlikely for MVP), use Outlook as backup:

```typescript
// If Gmail fails, try Outlook
let transporter = getTransporter('gmail');
try {
  await transporter.sendMail(mailOptions);
} catch (error) {
  console.log('Gmail failed, trying Outlook...');
  transporter = getTransporter('outlook');
  await transporter.sendMail(mailOptions);
}
```

---

## My Recommendation

**Best approach for you:**

1. **Create dedicated Gmail** ("PikAppoint Noreply" or similar)
   - Takes 2 minutes
   - Looks professional
   - Never worry about personal privacy

2. **Enable App Password**
   - Takes 3 minutes
   - Very secure (limited scope)

3. **Add to .secret**
   - Safe (not committed to git)
   - Easy to manage

4. **Use nodemailer in API route**
   - Simple code
   - Reliable (Gmail infrastructure)
   - $0 cost forever

**Total setup: 16 minutes, $0 cost, professional result.**

---

## Next Steps

Ready to implement?

1. Create dedicated Gmail account
2. Generate app password
3. Add to .secret
4. Create /api/send-email.ts
5. Test with one booking

All in 20 minutes, zero cost.

Should I create the exact code to add to your project?

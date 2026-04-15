# Using .secret for API Keys

## Short Answer: YES

You can read from `.secret` file instead of `.env`. Here's how:

---

## Method 1: Read .secret Directly (Backend Only)

```typescript
// api/send-email.ts (backend route)
import fs from 'fs';

function getSecrets() {
  const secretContent = fs.readFileSync('.secret', 'utf-8');
  const secrets = {};
  
  secretContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('=')) {
      const [key, ...rest] = line.split('=');
      secrets[key] = rest.join('=');
    }
  });
  
  return secrets;
}

const secrets = getSecrets();
const RESEND_API_KEY = secrets.RESEND_API_KEY; // From .secret
```

**When to use:** Backend-only (API routes, server-side functions)

**Security:** ✅ Safe - .secret never exposed to browser

---

## Method 2: Recommended - Add to .secret

Best approach: Store Resend API key in `.secret` like your other secrets:

```
# .secret file (already exists)
SUPABASE_KEY=your_supabase_key_here
SUPABASE_URL=your_url_here
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

Then read it in backend route:

```typescript
// src/api/send-email.ts (backend API route)
import fs from 'fs';

export async function POST(req: Request) {
  // Read .secret
  const secretContent = fs.readFileSync('.secret', 'utf-8');
  const secrets = {};
  
  secretContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('=')) {
      const [key, ...rest] = line.split('=');
      secrets[key] = rest.join('=');
    }
  });

  const { Resend } = await import('resend');
  const resend = new Resend(secrets.RESEND_API_KEY);
  
  const { email, appointment } = await req.json();
  
  const result = await resend.emails.send({
    from: 'noreply@timecraft.app',
    to: email,
    subject: '✅ Booking Confirmed!',
    html: `Your appointment on ${appointment.date} is confirmed!`
  });
  
  return Response.json(result);
}
```

---

## Method 3: Helper Function (Clean)

```typescript
// src/lib/secrets.ts
import fs from 'fs';

let cachedSecrets: Record<string, string> | null = null;

export function getSecrets() {
  if (cachedSecrets) return cachedSecrets;
  
  const secretContent = fs.readFileSync('.secret', 'utf-8');
  const secrets: Record<string, string> = {};
  
  secretContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('=')) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length > 0) {
        secrets[key] = rest.join('=').trim();
      }
    }
  });
  
  cachedSecrets = secrets;
  return secrets;
}

// Usage anywhere in backend:
import { getSecrets } from '@/lib/secrets';

const { RESEND_API_KEY } = getSecrets();
```

---

## Complete Implementation for Your App

### Step 1: Add Resend Key to .secret

```
SUPABASE_KEY=pk-..your key..
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Step 2: Create API Route

```typescript
// src/api/send-email.ts
import fs from 'fs';
import { Resend } from 'resend';

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

export async function POST(req: Request) {
  try {
    const { email, appointment } = await req.json();
    const { RESEND_API_KEY } = getSecrets();
    
    const resend = new Resend(RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: 'noreply@timecraft.app',
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
    
    return Response.json({ success: true, result });
  } catch (error: any) {
    console.error('Email send failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 3: Call from Frontend

In `BookingBrowse.tsx` after booking:

```typescript
// After successful booking
const { data, error } = await supabase.rpc('book_opening', {
  _opening_id: selectedSlot.id,
  _user_id: currentUser?.id
});

if (!error) {
  // Get appointment details
  const { data: appointment } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', data)
    .single();

  // Send email via API route
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      body: JSON.stringify({
        email: currentUser?.email,
        appointment
      })
    });
  } catch (emailErr) {
    console.log('Email send queued (non-blocking)');
  }

  toast.success('Booking confirmed! Check your email.');
}
```

---

## Security Notes

### ✅ Safe (Backend only)
- Reading .secret in API routes
- Reading .secret in server-side code
- Never exposed to browser

### ❌ NOT Safe (Don't do this)
- Don't read .secret in frontend code
- Don't pass .secret values to client
- Don't log .secret values
- Don't commit .secret to git

---

## Why This Works

1. **API route runs on server** - .secret file is accessible
2. **Frontend doesn't see it** - Browser never loads .secret
3. **No .env file needed** - Use .secret directly
4. **Secure by default** - Credentials never leave server

---

## If Using Vite/Frontend Only

If you're using Vite and need to reference .secret:

```typescript
// vite.config.ts
import fs from 'fs';

export default {
  define: {
    __RESEND_KEY__: JSON.stringify(
      fs.readFileSync('.secret', 'utf-8')
        .split('\n')
        .find(line => line.startsWith('RESEND_API_KEY='))
        ?.split('=')[1] || ''
    )
  }
}
```

**But this is NOT recommended** - exposes keys to frontend.

---

## Recommendation

✅ **Use API routes + .secret** (what I showed above)

This is:
- Secure (no keys in frontend)
- Clean (centralized secrets)
- Standard practice
- Works with your existing .secret file

No need for .env at all - just .secret.

# Privacy & Consent Components

React/TypeScript components for user consent, privacy preferences, and account management.

## Components

### 1. ConsentBanner
Location: `src/components/Privacy/ConsentBanner.tsx`

Signup consent banner with required and optional checkboxes.

**Usage:**
```tsx
import { ConsentBanner, ConsentData } from '@/components/Privacy';

function SignUpForm() {
  const [consent, setConsent] = useState<ConsentData | null>(null);
  
  const handleSubmit = () => {
    if (consent?.privacyPolicy && consent?.termsOfService) {
      // Save consent to backend
      await fetch('/api/consent', {
        method: 'POST',
        body: JSON.stringify(consent),
      });
      // Proceed with signup
    }
  };

  return (
    <ConsentBanner
      onConsentChange={setConsent}
      isSubmitDisabled={!consent}
      onSubmit={handleSubmit}
      submitLabel="Create Account"
    />
  );
}
```

**Features:**
- Required: Privacy Policy, Terms of Service
- Optional: Product updates, Analytics
- Clickable policy links (opens modal)
- Submit button auto-disabled until required checkboxes checked
- Accessible: ARIA labels, keyboard navigation

---

### 2. ConsentModal
Location: `src/components/Privacy/ConsentModal.tsx`

Modal displaying full policy text (Privacy Policy or Terms of Service).

**Usage:**
```tsx
import { ConsentModal } from '@/components/Privacy';

function PolicyLink() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>View Privacy Policy</button>
      <ConsentModal
        open={showModal}
        onOpenChange={setShowModal}
        contentType="privacy"
      />
    </>
  );
}
```

**Features:**
- Fetches policy from `/public/legal/privacy-policy.md` or `/public/legal/terms-of-service.md`
- Fallback content if files not found
- Scrollable, mobile-responsive
- Loading skeleton

---

### 3. PrivacySettings
Location: `src/components/Privacy/PrivacySettings.tsx`

Main privacy settings page with consent status, data export, account deletion.

**Usage:**
```tsx
import { PrivacySettings } from '@/components/Privacy';

function SettingsPage() {
  return (
    <Tabs defaultValue="privacy">
      <TabsContent value="privacy">
        <PrivacySettings />
      </TabsContent>
    </Tabs>
  );
}
```

**Features:**
- View consent history (dates, status)
- Toggle optional consents (product updates, analytics)
- Export data button → DataExportModal
- Delete account button → DeleteAccountModal
- Includes PreferencesCenter

---

### 4. PreferencesCenter
Location: `src/components/Privacy/PreferencesCenter.tsx`

Granular privacy preferences: email frequency, analytics, marketing, data retention.

**Usage:**
Included in `PrivacySettings` component, or use standalone:
```tsx
import { PreferencesCenter } from '@/components/Privacy';

<PreferencesCenter />
```

**Features:**
- Email frequency: Daily/Weekly/Monthly/Never
- Analytics toggle
- Marketing toggle
- Data retention: 30 days / 1 year / 7 years
- Save button with change detection

---

### 5. DataExportModal
Location: `src/components/Privacy/DataExportModal.tsx`

Multi-step data export workflow.

**Usage:**
```tsx
import { DataExportModal } from '@/components/Privacy';

function ExportButton() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <Button onClick={() => setShowModal(true)}>Export Data</Button>
      <DataExportModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
```

**Features:**
- Step 1: Select format (JSON/CSV) and scope (All/Appointments/Profile)
- Step 2: Confirm selections
- Step 3: Processing (progress bar, polls backend)
- Step 4: Download ready
- Status polling every 2 seconds

---

### 6. DeleteAccountModal
Location: `src/components/Privacy/DeleteAccountModal.tsx`

Multi-step account deletion with 30-day waiting period.

**Usage:**
```tsx
import { DeleteAccountModal } from '@/components/Privacy';

function DeleteButton() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <Button variant="destructive" onClick={() => setShowModal(true)}>
        Delete Account
      </Button>
      <DeleteAccountModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
```

**Features:**
- Step 1: Warning with list of data to be deleted
- Step 2: Password verification
- Step 3: Confirmation checkboxes (understand, no undo, data loss)
- Step 4: Success (30-day wait notice)
- Auto-signs out user after deletion scheduled

---

## Backend API Endpoints

Components call these endpoints (backend must implement):

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/api/consent` | POST | Save user consent | `{ privacyPolicy: bool, termsOfService: bool, productUpdates: bool, analytics: bool }` |
| `/api/user/preferences` | GET/PUT | Manage preferences | `{ email_frequency: string, analytics_enabled: bool, marketing_enabled: bool, data_retention_days: number }` |
| `/api/user/data/export` | POST | Trigger export | `{ format: 'json'|'csv', scope: 'all'|'appointments'|'profile', include_deleted: bool }` |
| `/api/user/data/download` | GET | Download export | Returns file (query param: `?job_id=xxx`) |
| `/api/user/account/delete` | POST | Request deletion | `{ user_id: string }` |
| `/api/user/account/delete/cancel` | POST | Cancel deletion | `{ user_id: string }` |

---

## Database Tables

### user_consents
```sql
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'privacy_policy', 'terms_of_service', 'product_updates', 'analytics'
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);
```

### user_preferences
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_frequency TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly', 'never'
  analytics_enabled BOOLEAN DEFAULT true,
  marketing_enabled BOOLEAN DEFAULT false,
  data_retention_days INTEGER DEFAULT 2555, -- 7 years
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### export_jobs
```sql
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'failed'
  format TEXT NOT NULL, -- 'json', 'csv'
  scope TEXT NOT NULL, -- 'all', 'appointments', 'profile'
  include_deleted BOOLEAN DEFAULT false,
  download_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

---

## Accessibility Compliance

All components follow WCAG 2.1 AA standards:

- ✅ All form controls have labels or `aria-label`
- ✅ Keyboard navigation supported
- ✅ Focus states visible (`focus-visible:ring-*`)
- ✅ Color contrast ratios meet AAA standards
- ✅ Screen reader announcements for async updates (`aria-live`)
- ✅ Semantic HTML (`<button>`, `<label>`, `<input>`)
- ✅ Error states inline next to fields
- ✅ Loading states with descriptive text (e.g., "Loading…")

---

## Mobile Responsive

- Tested on 375px (mobile), 768px (tablet), 1024px+ (desktop)
- Modals full-height on mobile
- Touch-friendly tap targets (min 44×44px)
- `touch-action: manipulation` prevents double-tap zoom delay

---

## Integration Example: Signup Flow

```tsx
import { useState } from 'react';
import { ConsentBanner, ConsentData } from '@/components/Privacy';
import { supabase } from '@/integrations/supabase/client';

function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!consent?.privacyPolicy || !consent?.termsOfService) {
      return; // ConsentBanner disables submit automatically
    }

    setLoading(true);
    try {
      // Create account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      // Save consent to database
      await supabase.from('user_consents').insert([
        { user_id: data.user?.id, consent_type: 'privacy_policy', granted: true },
        { user_id: data.user?.id, consent_type: 'terms_of_service', granted: true },
        { user_id: data.user?.id, consent_type: 'product_updates', granted: consent.productUpdates },
        { user_id: data.user?.id, consent_type: 'analytics', granted: consent.analytics },
      ]);

      // Success!
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form>
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      
      <ConsentBanner
        onConsentChange={setConsent}
        isSubmitDisabled={loading}
        onSubmit={handleSignUp}
        submitLabel="Create Account"
      />
    </form>
  );
}
```

---

## Legal Files

Place policy markdown files in `public/legal/`:
- `public/legal/privacy-policy.md`
- `public/legal/terms-of-service.md`

ConsentModal fetches these files. If not found, displays fallback content.

---

## Testing Checklist

- [ ] ConsentBanner requires both checkboxes before enabling submit
- [ ] Policy links open ConsentModal
- [ ] ConsentModal loads policy text (or fallback)
- [ ] PrivacySettings displays consent history
- [ ] PreferencesCenter saves changes to backend
- [ ] DataExportModal polls export status until ready
- [ ] DataExportModal triggers download
- [ ] DeleteAccountModal requires password verification
- [ ] DeleteAccountModal requires all confirmations
- [ ] DeleteAccountModal schedules deletion & signs out user
- [ ] All components keyboard-accessible
- [ ] All components screen-reader friendly
- [ ] All components responsive on mobile

---

## Notes

- **ConsentBanner** integrated into signup flow (not yet in existing `SignInDialog.tsx` — add to signup tab if needed)
- **PrivacySettings** added as new tab in `Settings.tsx` page
- All components use existing UI library (shadcn/ui)
- TypeScript strict mode enabled
- TanStack Query for data fetching
- Supabase backend (or Edge Functions for export/deletion)

---

**Contact:** Nova (Frontend Developer)  
**Project:** time-craft-scheduler-admin  
**Stack:** React + Vite + TypeScript + Tailwind CSS

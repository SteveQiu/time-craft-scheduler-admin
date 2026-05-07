# Legal Compliance Implementation Guide

**Document Version:** 1.0  
**For:** Frontend & Backend Teams  
**Project:** PikAppoint  
**Last Updated:** [LAST_UPDATED_DATE]

---

## Table of Contents

1. [Overview](#1-overview)
2. [Consent Management](#2-consent-management)
3. [Data Subject Rights Implementation](#3-data-subject-rights-implementation)
4. [Account Deletion](#4-account-deletion)
5. [Data Export (Data Portability)](#5-data-export-data-portability)
6. [User Preference Center](#6-user-preference-center)
7. [Cookie Consent Banner](#7-cookie-consent-banner)
8. [Audit Trail & Logging](#8-audit-trail--logging)
9. [Breach Notification](#9-breach-notification)
10. [API Endpoint Specifications](#10-api-endpoint-specifications)
11. [Testing & Validation](#11-testing--validation)
12. [Deployment Checklist](#12-deployment-checklist)

---

## 1. Overview

### 1.1 Purpose

This guide provides technical specifications for implementing legal compliance features in the PikAppoint application, including:
- GDPR (EU/EEA/UK) compliance
- CCPA/CPRA (California) compliance
- 2025 state privacy laws (TX, OR, MT, UT, IL, CO, CT, HI)

### 1.2 Compliance Requirements

**Must-Have Features:**
- ✅ Cookie consent banner (GDPR ePrivacy, CCPA)
- ✅ Terms of Service & Privacy Policy acceptance (GDPR Art. 13, CCPA § 1798.100)
- ✅ Data export functionality (GDPR Art. 20, CCPA § 1798.100)
- ✅ Account deletion (GDPR Art. 17, CCPA § 1798.105)
- ✅ Consent management (GDPR Art. 7)
- ✅ Preference center (GDPR Art. 21, CCPA § 1798.120)
- ✅ Audit logs (GDPR Art. 30, CCPA § 1798.100)

**Recommended Features:**
- 🔸 Data portability to third parties
- 🔸 Data rectification (GDPR Art. 16, CCPA § 1798.106)
- 🔸 Processing restriction (GDPR Art. 18)
- 🔸 Automated breach detection

---

## 2. Consent Management

### 2.1 Consent Types

**Consent Categories:**

| Consent Type | Required? | Legal Basis | Storage |
|--------------|-----------|-------------|---------|
| Terms of Service | ✅ Yes | Contract (GDPR Art. 6(1)(b)) | Database |
| Privacy Policy | ✅ Yes | Contract (GDPR Art. 6(1)(b)) | Database |
| Essential Cookies | ✅ Yes (no opt-out) | Legitimate Interest (GDPR Art. 6(1)(f)) | LocalStorage |
| Analytics Cookies | ❌ No (opt-in) | Consent (GDPR Art. 6(1)(a)) | Database + LocalStorage |
| Marketing Emails | ❌ No (opt-in) | Consent (GDPR Art. 6(1)(a)) | Database |
| Third-Party Data Sharing | ❌ No (opt-in) | Consent (GDPR Art. 6(1)(a)) | Database |

### 2.2 Database Schema

**Table: `user_consents`**

```sql
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL, -- 'terms', 'privacy', 'analytics', 'marketing', 'data_sharing'
  consent_version VARCHAR(20) NOT NULL, -- e.g., 'v1.0', '2024-01-15'
  consented BOOLEAN NOT NULL, -- true = opted in, false = opted out
  consent_method VARCHAR(50), -- 'signup', 'settings', 'banner', 'email'
  ip_address INET, -- IP address at time of consent (for proof)
  user_agent TEXT, -- Browser user agent (for proof)
  consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration (e.g., 2 years)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, consent_type) -- One active consent per type per user
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX idx_user_consents_consented ON user_consents(consented);

-- Audit trail for consent changes
CREATE TABLE user_consent_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  consent_version VARCHAR(20) NOT NULL,
  consented BOOLEAN NOT NULL,
  consent_method VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consent_history_user_id ON user_consent_history(user_id);
CREATE INDEX idx_consent_history_changed_at ON user_consent_history(changed_at);
```

### 2.3 React Component: Consent Checkbox

**Component: `ConsentCheckbox.tsx`**

```typescript
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface ConsentCheckboxProps {
  type: 'terms' | 'privacy' | 'marketing' | 'analytics';
  required?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  type,
  required = false,
  checked,
  onChange,
  error,
}) => {
  const consentLabels = {
    terms: {
      label: 'I agree to the',
      link: '/legal/terms-of-service',
      linkText: 'Terms of Service',
    },
    privacy: {
      label: 'I agree to the',
      link: '/legal/privacy-policy',
      linkText: 'Privacy Policy',
    },
    marketing: {
      label: 'I want to receive marketing emails and promotional offers',
      link: null,
      linkText: null,
    },
    analytics: {
      label: 'I allow analytics cookies to improve the service',
      link: '/legal/cookie-policy',
      linkText: 'Learn more',
    },
  };

  const config = consentLabels[type];

  return (
    <div className="flex items-start space-x-2">
      <input
        type="checkbox"
        id={`consent-${type}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
          error ? 'border-red-500' : ''
        }`}
        required={required}
      />
      <label htmlFor={`consent-${type}`} className="text-sm text-gray-700">
        {config.label}{' '}
        {config.link && (
          <Link
            to={config.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {config.linkText}
          </Link>
        )}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};
```

### 2.4 Signup Form Integration

**Component: `SignupForm.tsx`**

```typescript
import React, { useState } from 'react';
import { ConsentCheckbox } from './ConsentCheckbox';
import { recordConsent } from '@/services/consentService';

export const SignupForm: React.FC = () => {
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    marketing: false,
    analytics: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required consents
    const newErrors: Record<string, string> = {};
    if (!consents.terms) {
      newErrors.terms = 'You must agree to the Terms of Service';
    }
    if (!consents.privacy) {
      newErrors.privacy = 'You must agree to the Privacy Policy';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // 1. Create user account
      const user = await createUserAccount({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      // 2. Record all consents
      await Promise.all([
        recordConsent(user.id, 'terms', 'v1.0', true, 'signup'),
        recordConsent(user.id, 'privacy', 'v1.0', true, 'signup'),
        recordConsent(user.id, 'marketing', 'v1.0', consents.marketing, 'signup'),
        recordConsent(user.id, 'analytics', 'v1.0', consents.analytics, 'signup'),
      ]);

      // 3. Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup failed:', error);
      setErrors({ general: 'Signup failed. Please try again.' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email, password, name fields... */}

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-medium text-gray-900">Required Consents</h3>
        
        <ConsentCheckbox
          type="terms"
          required
          checked={consents.terms}
          onChange={(checked) => setConsents({ ...consents, terms: checked })}
          error={errors.terms}
        />
        
        <ConsentCheckbox
          type="privacy"
          required
          checked={consents.privacy}
          onChange={(checked) => setConsents({ ...consents, privacy: checked })}
          error={errors.privacy}
        />
      </div>

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-medium text-gray-900">Optional Preferences</h3>
        
        <ConsentCheckbox
          type="marketing"
          checked={consents.marketing}
          onChange={(checked) => setConsents({ ...consents, marketing: checked })}
        />
        
        <ConsentCheckbox
          type="analytics"
          checked={consents.analytics}
          onChange={(checked) => setConsents({ ...consents, analytics: checked })}
        />
      </div>

      <button type="submit" className="w-full btn-primary">
        Create Account
      </button>
    </form>
  );
};
```

### 2.5 Backend Service: Consent Recording

**Service: `consentService.ts`**

```typescript
import { supabase } from '@/lib/supabase';

export interface ConsentRecord {
  userId: string;
  consentType: 'terms' | 'privacy' | 'analytics' | 'marketing' | 'data_sharing';
  consentVersion: string;
  consented: boolean;
  consentMethod?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Record user consent (GDPR Art. 7 - Conditions for consent)
 * Must be freely given, specific, informed, and unambiguous
 */
export async function recordConsent(
  userId: string,
  consentType: ConsentRecord['consentType'],
  consentVersion: string,
  consented: boolean,
  consentMethod: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  const { error: insertError } = await supabase
    .from('user_consents')
    .upsert(
      {
        user_id: userId,
        consent_type: consentType,
        consent_version: consentVersion,
        consented,
        consent_method: consentMethod,
        ip_address: metadata?.ipAddress,
        user_agent: metadata?.userAgent,
        consented_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,consent_type' }
    );

  if (insertError) {
    throw new Error(`Failed to record consent: ${insertError.message}`);
  }

  // Also log to consent history (immutable audit trail)
  const { error: historyError } = await supabase
    .from('user_consent_history')
    .insert({
      user_id: userId,
      consent_type: consentType,
      consent_version: consentVersion,
      consented,
      consent_method: consentMethod,
      ip_address: metadata?.ipAddress,
      user_agent: metadata?.userAgent,
      changed_at: new Date().toISOString(),
    });

  if (historyError) {
    console.error('Failed to log consent history:', historyError);
    // Don't throw - consent was recorded successfully
  }
}

/**
 * Get user's current consents
 */
export async function getUserConsents(
  userId: string
): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('user_consents')
    .select('consent_type, consented')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch consents: ${error.message}`);
  }

  const consents: Record<string, boolean> = {};
  data.forEach((row) => {
    consents[row.consent_type] = row.consented;
  });

  return consents;
}

/**
 * Check if user has consented to a specific type
 * Returns false if consent not found or expired
 */
export async function hasConsent(
  userId: string,
  consentType: ConsentRecord['consentType']
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_consents')
    .select('consented, expires_at')
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .single();

  if (error || !data) {
    return false;
  }

  // Check if consent expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return false;
  }

  return data.consented;
}

/**
 * Withdraw consent (GDPR Art. 7(3) - Right to withdraw consent)
 */
export async function withdrawConsent(
  userId: string,
  consentType: ConsentRecord['consentType'],
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await recordConsent(
    userId,
    consentType,
    'withdrawn',
    false,
    'user_withdrawal',
    metadata
  );
}
```

---

## 3. Data Subject Rights Implementation

### 3.1 Rights Summary

**GDPR Rights (EU/EEA/UK):**
- **Art. 15:** Right of access
- **Art. 16:** Right to rectification
- **Art. 17:** Right to erasure ("right to be forgotten")
- **Art. 18:** Right to restriction of processing
- **Art. 20:** Right to data portability
- **Art. 21:** Right to object

**CCPA/CPRA Rights (California):**
- **§ 1798.100:** Right to know
- **§ 1798.105:** Right to delete
- **§ 1798.106:** Right to correct
- **§ 1798.120:** Right to opt-out of sale/sharing

### 3.2 Data Subject Access Request (DSAR) Workflow

**Process Flow:**

```
User submits request
  ↓
Verify user identity (email + additional data point)
  ↓
Log request in audit trail
  ↓
Generate data export OR process deletion
  ↓
Send confirmation email
  ↓
Response within timeline (GDPR: 30 days, CCPA: 45 days)
```

### 3.3 Database Schema: DSAR Tracking

```sql
CREATE TABLE dsar_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL, -- 'access', 'delete', 'correct', 'restrict', 'portability', 'object'
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  deadline_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Auto-calculated based on jurisdiction
  request_details JSONB, -- Additional info (e.g., specific data requested)
  response_details JSONB, -- Response notes, rejection reason, etc.
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dsar_user_id ON dsar_requests(user_id);
CREATE INDEX idx_dsar_status ON dsar_requests(status);
CREATE INDEX idx_dsar_deadline ON dsar_requests(deadline_at);
```

### 3.4 DSAR Request Form

**Component: `DSARRequestForm.tsx`**

```typescript
import React, { useState } from 'react';
import { submitDSAR } from '@/services/dsarService';

type RequestType = 'access' | 'delete' | 'correct' | 'portability';

export const DSARRequestForm: React.FC = () => {
  const [requestType, setRequestType] = useState<RequestType>('access');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitDSAR(requestType, details);
      setSuccess(true);
    } catch (error) {
      console.error('Failed to submit DSAR:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-green-800 font-medium">Request Submitted</h3>
        <p className="text-green-700 text-sm mt-1">
          We have received your data request. You will receive a confirmation email
          shortly. We will respond within the required timeframe (GDPR: 30 days, CCPA: 45 days).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Request Type
        </label>
        <select
          value={requestType}
          onChange={(e) => setRequestType(e.target.value as RequestType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="access">Access My Data (GDPR Art. 15 / CCPA § 1798.100)</option>
          <option value="delete">Delete My Account (GDPR Art. 17 / CCPA § 1798.105)</option>
          <option value="correct">Correct Inaccurate Data (GDPR Art. 16 / CCPA § 1798.106)</option>
          <option value="portability">Export My Data (GDPR Art. 20)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Details (Optional)
        </label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Provide any additional information about your request..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full btn-primary disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Request'}
      </button>

      <p className="text-xs text-gray-500">
        We will verify your identity before processing your request. You will receive
        a confirmation email with next steps.
      </p>
    </form>
  );
};
```

---

## 4. Account Deletion

### 4.1 Deletion Workflow

**Hard Delete vs. Soft Delete:**

| Data Type | Deletion Method | Retention Period | Reason |
|-----------|----------------|------------------|--------|
| User profile | Hard delete | 30 days (backups) | GDPR Art. 17 |
| Appointments (past) | Soft delete (anonymize) | 7 years | Legal/tax requirement |
| Appointments (future) | Hard delete | 30 days (backups) | No legal requirement |
| Payment records | Soft delete (anonymize) | 7 years | Tax/accounting law |
| Communication logs | Hard delete | 30 days (backups) | GDPR Art. 17 |
| Audit logs | Anonymize user data | 3 years | Legal compliance |
| Consent records | Keep anonymized | Indefinite | Proof of compliance (GDPR Art. 7) |

### 4.2 Deletion Cascade Rules

**Database Functions:**

```sql
-- Function to anonymize user data (soft delete)
CREATE OR REPLACE FUNCTION anonymize_user_data(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Anonymize user profile
  UPDATE auth.users
  SET
    email = CONCAT('deleted_', user_id_param, '@anonymized.local'),
    raw_user_meta_data = '{}',
    encrypted_password = NULL,
    confirmed_at = NULL
  WHERE id = user_id_param;

  -- Anonymize appointments (keep records for legal/tax)
  UPDATE appointments
  SET
    notes = '[DELETED]',
    customer_name = '[ANONYMIZED]',
    customer_email = '[ANONYMIZED]',
    customer_phone = '[ANONYMIZED]'
  WHERE user_id = user_id_param;

  -- Anonymize payment records (keep for 7 years)
  UPDATE payment_methods
  SET
    method_label = '[DELETED]',
    last_4_digits = NULL
  WHERE user_id = user_id_param;

  -- Anonymize consent records (keep consent_type and date, remove PII)
  UPDATE user_consents
  SET
    ip_address = NULL,
    user_agent = NULL
  WHERE user_id = user_id_param;

  -- Delete non-essential data
  DELETE FROM user_sessions WHERE user_id = user_id_param;
  DELETE FROM user_notifications WHERE user_id = user_id_param;
  DELETE FROM user_preferences WHERE user_id = user_id_param;

  -- Log deletion in audit trail
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    details,
    created_at
  ) VALUES (
    user_id_param,
    'account_deleted',
    'user',
    jsonb_build_object('method', 'user_request', 'date', NOW()),
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Function to hard delete user (after retention period)
CREATE OR REPLACE FUNCTION hard_delete_user(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete all user data (cascading)
  DELETE FROM auth.users WHERE id = user_id_param;
  -- Note: Foreign keys with ON DELETE CASCADE will handle related records
END;
$$ LANGUAGE plpgsql;
```

### 4.3 Frontend: Account Deletion UI

**Component: `DeleteAccountModal.tsx`**

```typescript
import React, { useState } from 'react';
import { deleteAccount } from '@/services/accountService';
import { useAuth } from '@/hooks/useAuth';

export const DeleteAccountModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { user, logout } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAccount();
      alert('Your account has been scheduled for deletion. You will be logged out now.');
      logout();
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account. Please contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-red-600 mb-4">Delete Account</h2>
        
        <div className="space-y-3 mb-6 text-sm text-gray-700">
          <p className="font-medium">⚠️ This action cannot be undone.</p>
          
          <p>When you delete your account:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Your profile will be permanently deleted</li>
            <li>Future appointments will be cancelled</li>
            <li>Most personal data will be deleted within 30 days</li>
            <li>Some records may be retained for legal/tax purposes (anonymized)</li>
            <li>Payment records will be retained for 7 years (tax requirement)</li>
          </ul>

          <p className="text-xs text-gray-500 italic">
            GDPR Art. 17 - Right to erasure | CCPA § 1798.105 - Right to delete
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="font-mono font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="DELETE"
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE' || isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 5. Data Export (Data Portability)

### 5.1 Export Scope

**Data Included in Export (GDPR Art. 20, CCPA § 1798.100):**

```typescript
interface UserDataExport {
  metadata: {
    exportDate: string;
    exportFormat: 'JSON' | 'CSV';
    dataSubject: {
      userId: string;
      email: string;
      name: string;
    };
    legalBasis: 'GDPR Art. 20' | 'CCPA § 1798.100';
  };
  profile: {
    email: string;
    name: string;
    phone: string;
    createdAt: string;
    lastLoginAt: string;
  };
  appointments: Array<{
    id: string;
    date: string;
    time: string;
    serviceType: string;
    worker: string;
    location: string;
    status: string;
    notes: string;
  }>;
  paymentMethods: Array<{
    type: string;
    label: string;
    last4Digits: string; // Only last 4 digits, never full card number
  }>;
  consents: Array<{
    type: string;
    consented: boolean;
    version: string;
    consentedAt: string;
  }>;
  activityLog: Array<{
    action: string;
    timestamp: string;
    ipAddress: string;
  }>;
}
```

### 5.2 Backend Service: Data Export

**Service: `dataExportService.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';

export async function generateUserDataExport(
  userId: string,
  format: 'JSON' | 'CSV' = 'JSON'
): Promise<Blob> {
  // 1. Fetch all user data
  const [profile, appointments, paymentMethods, consents, activityLog] = await Promise.all([
    fetchUserProfile(userId),
    fetchUserAppointments(userId),
    fetchUserPaymentMethods(userId),
    fetchUserConsents(userId),
    fetchUserActivityLog(userId),
  ]);

  const exportData: UserDataExport = {
    metadata: {
      exportDate: new Date().toISOString(),
      exportFormat: format,
      dataSubject: {
        userId: profile.id,
        email: profile.email,
        name: profile.name,
      },
      legalBasis: 'GDPR Art. 20', // or detect user location for CCPA
    },
    profile,
    appointments,
    paymentMethods,
    consents,
    activityLog,
  };

  // 2. Create ZIP archive
  const zip = new JSZip();

  if (format === 'JSON') {
    zip.file('user_data.json', JSON.stringify(exportData, null, 2));
    zip.file('README.txt', generateReadmeText());
  } else {
    // CSV format (multiple files)
    zip.file('profile.csv', convertToCSV([profile]));
    zip.file('appointments.csv', convertToCSV(appointments));
    zip.file('payment_methods.csv', convertToCSV(paymentMethods));
    zip.file('consents.csv', convertToCSV(consents));
    zip.file('activity_log.csv', convertToCSV(activityLog));
    zip.file('README.txt', generateReadmeText());
  }

  // 3. Generate ZIP blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // 4. Log export in audit trail
  await logDataExport(userId);

  return zipBlob;
}

async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('auth.users')
    .select('id, email, raw_user_meta_data, created_at, last_sign_in_at')
    .eq('id', userId)
    .single();

  if (error) throw new Error(`Failed to fetch profile: ${error.message}`);

  return {
    email: data.email,
    name: data.raw_user_meta_data?.name || '',
    phone: data.raw_user_meta_data?.phone || '',
    createdAt: data.created_at,
    lastLoginAt: data.last_sign_in_at,
  };
}

async function fetchUserAppointments(userId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw new Error(`Failed to fetch appointments: ${error.message}`);

  return data.map((apt) => ({
    id: apt.id,
    date: apt.date,
    time: apt.time,
    serviceType: apt.service_type,
    worker: apt.worker_name,
    location: apt.location,
    status: apt.status,
    notes: apt.notes || '',
  }));
}

async function fetchUserPaymentMethods(userId: string) {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to fetch payment methods: ${error.message}`);

  return data.map((pm) => ({
    type: pm.type,
    label: pm.label,
    last4Digits: pm.last_4_digits || 'N/A',
  }));
}

async function fetchUserConsents(userId: string) {
  const { data, error } = await supabase
    .from('user_consents')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to fetch consents: ${error.message}`);

  return data.map((c) => ({
    type: c.consent_type,
    consented: c.consented,
    version: c.consent_version,
    consentedAt: c.consented_at,
  }));
}

async function fetchUserActivityLog(userId: string) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('action, created_at, ip_address')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1000); // Last 1000 actions

  if (error) throw new Error(`Failed to fetch activity log: ${error.message}`);

  return data.map((log) => ({
    action: log.action,
    timestamp: log.created_at,
    ipAddress: log.ip_address || 'N/A',
  }));
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((header) => JSON.stringify(row[header] || '')).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

function generateReadmeText(): string {
  return `
Data Export README
==================

This archive contains your personal data as requested under:
- GDPR Article 20 (Right to data portability) [EU/EEA/UK]
- CCPA § 1798.100 (Right to know) [California]

Files Included:
- user_data.json (or CSV files): Your personal data
- README.txt: This file

Data Categories:
- Profile: Account information (email, name, phone)
- Appointments: Scheduling history
- Payment Methods: Saved payment methods (no full card numbers)
- Consents: Your consent history
- Activity Log: Recent account activity

Questions?
Contact our Data Protection Officer at privacy@yourcompany.com

Generated: ${new Date().toISOString()}
  `.trim();
}

async function logDataExport(userId: string): Promise<void> {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'data_export',
    resource_type: 'user',
    details: { exported_at: new Date().toISOString() },
  });
}
```

### 5.3 Frontend: Data Export UI

**Component: `DataExportButton.tsx`**

```typescript
import React, { useState } from 'react';
import { generateUserDataExport } from '@/services/dataExportService';
import { useAuth } from '@/hooks/useAuth';

export const DataExportButton: React.FC = () => {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const blob = await generateUserDataExport(user.id, 'JSON');

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_data_${user.id}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('Data export completed! Check your downloads folder.');
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again or contact support.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="btn-secondary disabled:opacity-50"
    >
      {isExporting ? 'Exporting...' : '📥 Export My Data'}
    </button>
  );
};
```

---

## 6. User Preference Center

### 6.1 Preference Center UI

**Component: `PreferenceCenter.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { getUserConsents, recordConsent } from '@/services/consentService';
import { useAuth } from '@/hooks/useAuth';

export const PreferenceCenter: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    marketing: false,
    analytics: false,
    dataSharing: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const consents = await getUserConsents(user.id);
      setPreferences({
        marketing: consents.marketing || false,
        analytics: consents.analytics || false,
        dataSharing: consents.data_sharing || false,
      });
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await Promise.all([
        recordConsent(user.id, 'marketing', 'v1.0', preferences.marketing, 'settings'),
        recordConsent(user.id, 'analytics', 'v1.0', preferences.analytics, 'settings'),
        recordConsent(
          user.id,
          'data_sharing',
          'v1.0',
          preferences.dataSharing,
          'settings'
        ),
      ]);

      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-xl font-bold">Privacy Preferences</h2>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="pref-marketing"
            checked={preferences.marketing}
            onChange={(e) =>
              setPreferences({ ...preferences, marketing: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded"
          />
          <div>
            <label htmlFor="pref-marketing" className="font-medium text-gray-900">
              Marketing Communications
            </label>
            <p className="text-sm text-gray-600">
              Receive promotional emails, newsletters, and special offers.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="pref-analytics"
            checked={preferences.analytics}
            onChange={(e) =>
              setPreferences({ ...preferences, analytics: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded"
          />
          <div>
            <label htmlFor="pref-analytics" className="font-medium text-gray-900">
              Analytics Cookies
            </label>
            <p className="text-sm text-gray-600">
              Help us improve the service by allowing analytics cookies. See our{' '}
              <a href="/legal/cookie-policy" className="text-blue-600 hover:underline">
                Cookie Policy
              </a>
              .
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="pref-data-sharing"
            checked={preferences.dataSharing}
            onChange={(e) =>
              setPreferences({ ...preferences, dataSharing: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded"
          />
          <div>
            <label htmlFor="pref-data-sharing" className="font-medium text-gray-900">
              Third-Party Data Sharing
            </label>
            <p className="text-sm text-gray-600">
              Allow sharing anonymized data with trusted partners for research and
              analytics.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="btn-primary disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Preferences'}
      </button>

      <div className="border-t pt-4 space-y-2">
        <h3 className="font-medium text-gray-900">Your Rights</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            📥 <a href="#" className="text-blue-600 hover:underline">Export my data</a> (GDPR Art. 20)
          </li>
          <li>
            🗑️ <a href="#" className="text-blue-600 hover:underline">Delete my account</a> (GDPR Art. 17, CCPA § 1798.105)
          </li>
          <li>
            ✏️ <a href="#" className="text-blue-600 hover:underline">Correct my data</a> (GDPR Art. 16, CCPA § 1798.106)
          </li>
        </ul>
      </div>
    </div>
  );
};
```

---

## 7. Cookie Consent Banner

### 7.1 Cookie Banner UI

**Component: `CookieConsentBanner.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { recordConsent } from '@/services/consentService';
import { useAuth } from '@/hooks/useAuth';

export const CookieConsentBanner: React.FC = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always true, cannot be disabled
    analytics: false,
    functional: false,
  });

  useEffect(() => {
    // Check if consent already given
    const consentGiven = localStorage.getItem('cookie_consent');
    if (!consentGiven) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = async () => {
    const newPreferences = { essential: true, analytics: true, functional: true };
    await savePreferences(newPreferences);
  };

  const handleAcceptEssential = async () => {
    const newPreferences = { essential: true, analytics: false, functional: false };
    await savePreferences(newPreferences);
  };

  const handleSavePreferences = async () => {
    await savePreferences(preferences);
  };

  const savePreferences = async (prefs: typeof preferences) => {
    try {
      // Save to localStorage (for non-authenticated users)
      localStorage.setItem('cookie_consent', JSON.stringify(prefs));

      // Save to database (for authenticated users)
      if (user) {
        await recordConsent(user.id, 'analytics', 'v1.0', prefs.analytics, 'banner');
      }

      setIsVisible(false);

      // Apply cookie preferences
      if (prefs.analytics) {
        enableAnalytics();
      } else {
        disableAnalytics();
      }
    } catch (error) {
      console.error('Failed to save cookie preferences:', error);
    }
  };

  const enableAnalytics = () => {
    // Initialize Google Analytics (if analytics consent given)
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
      });
    }
  };

  const disableAnalytics = () => {
    // Disable Google Analytics
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-50">
      <div className="max-w-6xl mx-auto">
        {!showDetails ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-800">
                🍪 We use cookies to improve your experience. By using our site, you
                agree to our use of cookies. See our{' '}
                <a
                  href="/legal/cookie-policy"
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Cookie Policy
                </a>{' '}
                and{' '}
                <a
                  href="/legal/privacy-policy"
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Customize
              </button>
              <button
                onClick={handleAcceptEssential}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-md"
              >
                Essential Only
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900">Cookie Preferences</h3>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="cookie-essential"
                  checked={preferences.essential}
                  disabled
                  className="mt-1 h-4 w-4 rounded"
                />
                <div>
                  <label htmlFor="cookie-essential" className="font-medium text-gray-900">
                    Essential Cookies (Required)
                  </label>
                  <p className="text-sm text-gray-600">
                    Necessary for the website to function. Cannot be disabled.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="cookie-analytics"
                  checked={preferences.analytics}
                  onChange={(e) =>
                    setPreferences({ ...preferences, analytics: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded"
                />
                <div>
                  <label htmlFor="cookie-analytics" className="font-medium text-gray-900">
                    Analytics Cookies
                  </label>
                  <p className="text-sm text-gray-600">
                    Help us understand how users interact with our service.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="cookie-functional"
                  checked={preferences.functional}
                  onChange={(e) =>
                    setPreferences({ ...preferences, functional: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded"
                />
                <div>
                  <label htmlFor="cookie-functional" className="font-medium text-gray-900">
                    Functional Cookies
                  </label>
                  <p className="text-sm text-gray-600">
                    Remember your preferences and personalize your experience.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Back
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 8. Audit Trail & Logging

### 8.1 Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if user deleted
  action VARCHAR(100) NOT NULL, -- 'login', 'data_export', 'consent_changed', 'account_deleted', etc.
  resource_type VARCHAR(50), -- 'user', 'appointment', 'payment_method', etc.
  resource_id UUID, -- ID of affected resource
  details JSONB, -- Additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- Retention policy: Keep audit logs for 3 years
CREATE OR REPLACE FUNCTION delete_old_audit_logs()
RETURNS VOID AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '3 years';
END;
$$ LANGUAGE plpgsql;
```

### 8.2 Logging Service

```typescript
export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  SIGNUP = 'signup',
  DATA_EXPORT = 'data_export',
  ACCOUNT_DELETED = 'account_deleted',
  CONSENT_CHANGED = 'consent_changed',
  PREFERENCE_UPDATED = 'preference_updated',
  PASSWORD_CHANGED = 'password_changed',
  DATA_ACCESSED = 'data_accessed',
}

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: entry.userId,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    details: entry.details,
    ip_address: entry.ipAddress,
    user_agent: entry.userAgent,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging failure shouldn't break app
  }
}

// Example usage
await logAuditEvent({
  userId: user.id,
  action: AuditAction.DATA_EXPORT,
  resourceType: 'user',
  resourceId: user.id,
  details: { format: 'JSON', size: '1.2MB' },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

---

## 9. Breach Notification

### 9.1 Breach Detection

**Automated Monitoring:**

```typescript
// Monitor for suspicious activity
export async function detectSuspiciousActivity(userId: string): Promise<boolean> {
  // Check for multiple failed login attempts
  const failedLogins = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('action', 'login_failed')
    .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 min
    .limit(5);

  if (failedLogins.data && failedLogins.data.length >= 5) {
    await logSecurityEvent('multiple_failed_logins', userId);
    return true;
  }

  // Check for login from unusual location
  // (Implementation depends on geolocation service)

  return false;
}

async function logSecurityEvent(eventType: string, userId: string): Promise<void> {
  await supabase.from('security_events').insert({
    user_id: userId,
    event_type: eventType,
    severity: 'high',
    detected_at: new Date().toISOString(),
  });

  // Alert security team
  // sendSecurityAlert(eventType, userId);
}
```

### 9.2 Breach Notification Template

**GDPR requires notification within 72 hours (Art. 33)**  
**CCPA requires notification without unreasonable delay (§ 1798.150)**

**Email Template:**

```
Subject: [URGENT] Security Incident Notification

Dear [USER_NAME],

We are writing to inform you of a security incident that may have affected your personal data.

WHAT HAPPENED:
On [DATE], we discovered [DESCRIPTION OF BREACH]. We immediately took steps to secure our systems and investigate the incident.

WHAT DATA WAS AFFECTED:
- [LIST DATA TYPES: Email, name, phone, appointment history, etc.]
- [SPECIFY IF SENSITIVE DATA: Passwords, payment info, etc.]

ACTIONS WE HAVE TAKEN:
- [List remediation steps]
- Notified relevant authorities (GDPR: within 72 hours)
- Enhanced security measures

WHAT YOU SHOULD DO:
- Change your password immediately
- Monitor your account for suspicious activity
- Enable multi-factor authentication (if available)
- [Additional recommendations]

YOUR RIGHTS:
Under GDPR (Art. 34) and CCPA (§ 1798.150), you have the right to:
- Request more information about the breach
- Lodge a complaint with a supervisory authority
- Request deletion of your account

CONTACT US:
Email: security@yourcompany.com
Phone: [PHONE]

We sincerely apologize for this incident and any inconvenience it may cause.

[COMPANY_NAME] Legal Team
```

---

## 10. API Endpoint Specifications

### 10.1 Consent Endpoints

**POST /api/consent**

```typescript
Request:
{
  "consentType": "marketing" | "analytics" | "data_sharing",
  "consented": boolean,
  "version": "v1.0"
}

Response:
{
  "success": true,
  "message": "Consent recorded successfully"
}
```

**GET /api/consent**

```typescript
Response:
{
  "consents": {
    "terms": true,
    "privacy": true,
    "marketing": false,
    "analytics": true,
    "data_sharing": false
  }
}
```

### 10.2 DSAR Endpoints

**POST /api/dsar/request**

```typescript
Request:
{
  "requestType": "access" | "delete" | "correct" | "portability",
  "details": "Optional additional information"
}

Response:
{
  "requestId": "uuid",
  "status": "pending",
  "estimatedCompletion": "2024-02-15T00:00:00Z",
  "message": "Your request has been submitted. You will receive a confirmation email shortly."
}
```

**GET /api/dsar/status/:requestId**

```typescript
Response:
{
  "requestId": "uuid",
  "requestType": "access",
  "status": "completed" | "pending" | "in_progress" | "rejected",
  "submittedAt": "2024-01-15T10:00:00Z",
  "completedAt": "2024-01-20T14:30:00Z",
  "downloadUrl": "https://..."  // If completed
}
```

### 10.3 Data Export Endpoints

**GET /api/user/export**

```typescript
Query Parameters:
?format=json|csv

Response:
Binary (ZIP file download)
Headers:
Content-Type: application/zip
Content-Disposition: attachment; filename="user_data_[USER_ID]_[TIMESTAMP].zip"
```

### 10.4 Account Deletion Endpoints

**POST /api/user/delete**

```typescript
Request:
{
  "confirmation": "DELETE",
  "reason": "Optional reason for deletion"
}

Response:
{
  "success": true,
  "message": "Your account has been scheduled for deletion. Most data will be deleted within 30 days.",
  "retentionNotice": "Some records may be retained for legal/tax purposes (anonymized)."
}
```

---

## 11. Testing & Validation

### 11.1 Test Cases

**Consent Management:**
- ✅ User can accept required consents during signup
- ✅ User cannot signup without accepting Terms/Privacy
- ✅ User can opt-in/opt-out of marketing emails
- ✅ Consent changes are logged in audit trail
- ✅ Withdrawn consent is respected (marketing emails stop)

**Data Export:**
- ✅ Export includes all personal data categories
- ✅ Export format is machine-readable (JSON/CSV)
- ✅ Export does not include other users' data
- ✅ Export request is logged in audit trail
- ✅ Export completes within 1 minute for typical user

**Account Deletion:**
- ✅ User must type "DELETE" to confirm
- ✅ Account is anonymized/deleted within 30 days
- ✅ Future appointments are cancelled
- ✅ Payment records are retained (anonymized) for 7 years
- ✅ User receives confirmation email

**Cookie Banner:**
- ✅ Banner appears on first visit
- ✅ Essential cookies work without consent
- ✅ Analytics cookies only load after consent
- ✅ Preferences are saved in localStorage
- ✅ Banner respects "Customize" choices

### 11.2 Playwright Test Examples

**Test: Signup with Consent**

```typescript
import { test, expect } from '@playwright/test';

test('User can signup with required consents', async ({ page }) => {
  await page.goto('/signup');

  // Fill signup form
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.fill('[name="name"]', 'Test User');

  // Try submitting without consents - should fail
  await page.click('button[type="submit"]');
  await expect(page.locator('text=You must agree to the Terms')).toBeVisible();

  // Accept required consents
  await page.check('#consent-terms');
  await page.check('#consent-privacy');

  // Submit - should succeed
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');

  // Verify consents recorded in database
  const consents = await getConsentsFromDB('test@example.com');
  expect(consents.terms).toBe(true);
  expect(consents.privacy).toBe(true);
});

test('User can export data', async ({ page }) => {
  await page.goto('/settings/privacy');

  // Click export button
  const downloadPromise = page.waitForEvent('download');
  await page.click('text=Export My Data');
  const download = await downloadPromise;

  // Verify download filename
  expect(download.suggestedFilename()).toMatch(/user_data_.*\.zip/);

  // Verify download size > 0
  const path = await download.path();
  const fs = require('fs');
  const stats = fs.statSync(path);
  expect(stats.size).toBeGreaterThan(0);
});

test('User can delete account', async ({ page }) => {
  await page.goto('/settings/account');

  // Open delete modal
  await page.click('text=Delete Account');
  await expect(page.locator('text=This action cannot be undone')).toBeVisible();

  // Try deleting without confirmation - should fail
  await page.click('button:has-text("Delete Account")');
  // Button should be disabled

  // Type confirmation
  await page.fill('[placeholder="DELETE"]', 'DELETE');

  // Delete account
  await page.click('button:has-text("Delete Account")');

  // Verify redirect to logout/homepage
  await expect(page).toHaveURL('/');

  // Verify account no longer exists in database
  const user = await getUserFromDB('test@example.com');
  expect(user).toBeNull();
});
```

---

## 12. Deployment Checklist

### 12.1 Pre-Launch Checklist

**Legal Documents:**
- ✅ Privacy Policy reviewed by attorney
- ✅ Terms of Service reviewed by attorney
- ✅ Cookie Policy reviewed by attorney
- ✅ All placeholders replaced ([COMPANY_NAME], [EMAIL], etc.)
- ✅ Effective dates set
- ✅ Legal documents accessible at /legal/* URLs

**Database:**
- ✅ `user_consents` table created
- ✅ `user_consent_history` table created
- ✅ `dsar_requests` table created
- ✅ `audit_logs` table created
- ✅ Indexes created for performance
- ✅ Foreign keys and cascades configured
- ✅ Backup strategy in place

**Frontend:**
- ✅ Cookie consent banner implemented
- ✅ Signup form includes consent checkboxes
- ✅ Preference center implemented
- ✅ Data export button works
- ✅ Account deletion flow works
- ✅ Legal document links in footer

**Backend:**
- ✅ Consent recording API endpoints
- ✅ Data export API endpoint
- ✅ Account deletion API endpoint
- ✅ DSAR request API endpoints
- ✅ Audit logging implemented
- ✅ Email templates for notifications

**Testing:**
- ✅ All Playwright tests passing
- ✅ Manual testing completed
- ✅ Load testing for data export (1000+ users)
- ✅ Security testing (SQL injection, XSS)

**Compliance:**
- ✅ GDPR requirements verified
- ✅ CCPA requirements verified
- ✅ Cookie consent compliant with ePrivacy Directive
- ✅ Data retention policies implemented
- ✅ Breach notification plan documented

### 12.2 Post-Launch Monitoring

**Weekly:**
- Monitor DSAR request queue
- Review audit logs for suspicious activity
- Check data export success rate

**Monthly:**
- Review consent opt-in/opt-out rates
- Analyze user preference trends
- Update legal documents if regulations change

**Quarterly:**
- Conduct DPIA (Data Protection Impact Assessment)
- Review and update data retention policies
- Legal team review of compliance status

---

## 13. Support & Maintenance

### 13.1 Common Issues

**Issue: User can't export data**
- Check: Is user authenticated?
- Check: Database connection working?
- Check: Disk space for ZIP generation?
- Solution: Retry export, check logs

**Issue: Cookie banner not appearing**
- Check: LocalStorage consent_status key
- Solution: Clear localStorage, reload page

**Issue: Account deletion fails**
- Check: Foreign key constraints
- Check: Backup retention conflicts
- Solution: Run anonymization script manually

### 13.2 Contact for Legal Questions

**Data Protection Officer:** [DPO_EMAIL]  
**Legal Team:** [LEGAL_EMAIL]  
**Security Team:** [SECURITY_EMAIL]

---

**END OF IMPLEMENTATION GUIDE**

*This guide is a living document and should be updated as regulations change or new features are added. Last reviewed: [LAST_UPDATED_DATE]*

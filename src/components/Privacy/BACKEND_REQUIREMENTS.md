# Backend API Requirements for Privacy Components

## Overview
Frontend privacy components require these backend endpoints and database tables.

## Required Endpoints

### 1. POST /api/consent
**Purpose:** Save user consent choices during signup

**Request Body:**
```json
{
  "user_id": "uuid",
  "consents": {
    "privacy_policy": true,
    "terms_of_service": true,
    "product_updates": false,
    "analytics": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Consent saved"
}
```

---

### 2. GET /api/user/preferences
**Purpose:** Fetch user privacy preferences

**Response:**
```json
{
  "user_id": "uuid",
  "email_frequency": "weekly",
  "analytics_enabled": true,
  "marketing_enabled": false,
  "data_retention_days": 2555
}
```

---

### 3. PUT /api/user/preferences
**Purpose:** Update user privacy preferences

**Request Body:**
```json
{
  "email_frequency": "monthly",
  "analytics_enabled": false,
  "marketing_enabled": false,
  "data_retention_days": 365
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preferences updated"
}
```

---

### 4. POST /api/user/data/export
**Purpose:** Trigger data export job

**Request Body:**
```json
{
  "format": "json",
  "scope": "all",
  "include_deleted": false
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "pending",
  "created_at": "2026-01-15T10:30:00Z"
}
```

**Export Job Process:**
1. Create `export_jobs` record with status `pending`
2. Trigger background job to gather data
3. Update status to `processing`
4. Generate file (JSON or CSV) and upload to storage (S3/Supabase Storage)
5. Update status to `ready` and set `download_url`
6. Frontend polls `/api/user/data/export/:job_id` for status updates

---

### 5. GET /api/user/data/export/:job_id
**Purpose:** Check export job status

**Response:**
```json
{
  "id": "uuid",
  "status": "ready",
  "download_url": "https://storage.example.com/exports/user-data-123.json",
  "created_at": "2026-01-15T10:30:00Z",
  "completed_at": "2026-01-15T10:32:00Z"
}
```

**Status Values:**
- `pending` - Job created, not started
- `processing` - Data being gathered
- `ready` - File ready for download
- `failed` - Export failed (show error message)

---

### 6. POST /api/user/account/delete
**Purpose:** Schedule account deletion

**Request Body:**
```json
{
  "user_id": "uuid",
  "password": "user-password-for-verification"
}
```

**Process:**
1. Verify password
2. Create `deletion_requests` record with `scheduled_at` = now + 30 days
3. Send confirmation email with cancellation link
4. Return success

**Response:**
```json
{
  "success": true,
  "scheduled_at": "2026-02-14T10:30:00Z",
  "message": "Account deletion scheduled"
}
```

---

### 7. POST /api/user/account/delete/cancel
**Purpose:** Cancel pending account deletion

**Request Body:**
```json
{
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account deletion cancelled"
}
```

---

## Required Database Tables

### user_consents
```sql
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
```

**Consent Types:**
- `privacy_policy`
- `terms_of_service`
- `product_updates`
- `analytics`
- `marketing`

---

### user_preferences
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_frequency TEXT DEFAULT 'weekly' CHECK (email_frequency IN ('daily', 'weekly', 'monthly', 'never')),
  analytics_enabled BOOLEAN DEFAULT true,
  marketing_enabled BOOLEAN DEFAULT false,
  data_retention_days INTEGER DEFAULT 2555 CHECK (data_retention_days IN (30, 365, 2555)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### export_jobs
```sql
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  format TEXT NOT NULL CHECK (format IN ('json', 'csv')),
  scope TEXT NOT NULL CHECK (scope IN ('all', 'appointments', 'profile')),
  include_deleted BOOLEAN DEFAULT false,
  download_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
```

**Auto-cleanup:** Delete export files and records older than 7 days (cron job)

---

### deletion_requests
```sql
CREATE TABLE deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed'))
);

CREATE INDEX idx_deletion_requests_scheduled_at ON deletion_requests(scheduled_at);
```

**Background Job:** Daily cron checks for `scheduled_at` < NOW() and `status = 'pending'` → delete user account

---

## Data Export Contents

### Scope: "all"
- Profile: name, email, created_at
- Appointments: all booking records
- Workplace addresses
- Payment methods (masked card numbers)
- Preferences and consents
- Activity logs (optional)

### Scope: "appointments"
- All appointment records with timestamps, services, notes

### Scope: "profile"
- Personal information
- Settings and preferences
- Consent history

**Format:**
- **JSON:** Nested structure, machine-readable
- **CSV:** Flattened tables, spreadsheet-friendly

---

## Security Considerations

1. **Password Verification:** Account deletion requires password re-verification
2. **Rate Limiting:** Limit export/deletion requests (e.g., 5 per hour)
3. **Download URLs:** Signed, expiring URLs (valid for 1 hour)
4. **Audit Logging:** Log all consent changes, exports, deletion requests
5. **GDPR Compliance:** Right to access, rectify, delete, port data

---

## Email Notifications

### Export Ready
```
Subject: Your Data Export is Ready
Body: Your data export is ready for download. Click here to download: [link]
Expires in 7 days.
```

### Deletion Scheduled
```
Subject: Account Deletion Scheduled
Body: Your account is scheduled for deletion on [date]. Log in to cancel: [link]
```

### Deletion Cancelled
```
Subject: Account Deletion Cancelled
Body: Your account deletion request has been cancelled. Your account remains active.
```

### Deletion Completed
```
Subject: Account Deleted
Body: Your PikAppoint account has been permanently deleted. All data has been removed.
```

---

## Testing Checklist

- [ ] POST /api/consent saves all consent types
- [ ] GET /api/user/preferences returns defaults if not set
- [ ] PUT /api/user/preferences validates enum values
- [ ] POST /api/user/data/export creates job and returns job_id
- [ ] GET /api/user/data/export/:job_id returns current status
- [ ] Background worker processes export jobs
- [ ] Export files stored securely with expiring URLs
- [ ] POST /api/user/account/delete verifies password
- [ ] POST /api/user/account/delete/cancel works within 30-day window
- [ ] Background worker deletes accounts after 30 days
- [ ] All endpoints require authentication
- [ ] Rate limiting enforced
- [ ] Email notifications sent for all events

---

## Implementation Notes

### Supabase Edge Functions
Create Edge Functions for:
- `export-user-data` - Handles export job creation and processing
- `delete-user-account` - Handles deletion scheduling

### Database Triggers
```sql
-- Update updated_at on preference changes
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Row Level Security (RLS)
```sql
-- user_preferences: users can only access their own
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_preferences_policy ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- user_consents: users can only access their own
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_consents_policy ON user_consents
  FOR ALL USING (auth.uid() = user_id);

-- export_jobs: users can only access their own
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY export_jobs_policy ON export_jobs
  FOR ALL USING (auth.uid() = user_id);
```

---

**Contact:** Nova (Frontend Developer)  
**Backend Coordination:** Needed for full feature completion

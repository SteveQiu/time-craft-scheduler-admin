# Supabase Schema Specification

## Overview
Complete specification of the Time Craft Scheduler database schema with all tables, columns, types, constraints, and policies.

---

## Table 1: `profiles`
**Purpose:** User profiles (customers and providers)

### Columns
| Column | Type | Null | Default | Constraints | Purpose |
|--------|------|------|---------|-------------|---------|
| `id` | uuid | NO | auth.uid() | PRIMARY KEY | Auth user ID |
| `email` | text | YES | NULL | UNIQUE | Contact email |
| `full_name` | text | YES | NULL | | Display name |
| `slug` | text | YES | NULL | UNIQUE | URL-friendly identifier |
| `avatar_url` | text | YES | NULL | | Profile picture |
| `bio` | text | YES | NULL | | Bio/description |
| `created_at` | timestamp | NO | now() | | Creation time |
| `updated_at` | timestamp | NO | now() | | Last update time |

### Indexes
- PRIMARY KEY on `id`
- UNIQUE on `email`
- UNIQUE on `slug`

### RLS Policies
- **SELECT:** Authenticated users can read all profiles (public)
- **INSERT:** Users can only insert their own profile
- **UPDATE:** Users can only update their own profile
- **DELETE:** Users cannot delete profiles

---

## Table 2: `openings`
**Purpose:** Available time slots that providers create

### Columns
| Column | Type | Null | Default | Constraints | Purpose |
|--------|------|------|---------|-------------|---------|
| `id` | uuid | NO | gen_random_uuid() | PRIMARY KEY | Unique opening ID |
| `user_id` | uuid | NO | | FK → profiles.id | Provider who created this |
| `date` | date | NO | | | Date of the opening |
| `start_time` | time | NO | | | Start time |
| `end_time` | time | NO | | | End time |
| `duration` | integer | NO | | | Duration in minutes (60, 120, etc) |
| `service` | text | NO | | | Type of service (e.g., "Consultation") |
| `worker` | text | NO | | | Worker name handling this |
| `is_available` | boolean | NO | true | | Whether slot is still available |
| `hourly_rate` | numeric | YES | NULL | | Cost per hour |
| `location` | text | YES | NULL | | Where the service happens |
| `created_at` | timestamp | NO | now() | | Creation time |
| `updated_at` | timestamp | NO | now() | | Last update time |

### Indexes
- PRIMARY KEY on `id`
- FOREIGN KEY on `user_id` → profiles.id
- INDEX on `user_id` (for provider queries)
- INDEX on `is_available, date` (for browsing available slots)
- INDEX on `date` (for filtering by date)

### RLS Policies
- **SELECT:** Public (anyone can see available openings)
- **INSERT:** Authenticated users can only insert their own openings
- **UPDATE:** Users can only update their own openings
- **DELETE:** Users can only delete their own openings

---

## Table 3: `appointments`
**Purpose:** Bookings made when users reserve openings

### Columns
| Column | Type | Null | Default | Constraints | Purpose |
|--------|------|------|---------|-------------|---------|
| `id` | uuid | NO | gen_random_uuid() | PRIMARY KEY | Unique appointment ID |
| `opening_id` | uuid | NO | | FK → openings.id | Which opening was booked |
| `user_id` | uuid | NO | | FK → profiles.id | Who made the booking |
| `provider_id` | uuid | NO | | FK → profiles.id | Provider (from opening) |
| `worker` | text | NO | | | Worker name (copy from opening) |
| `service` | text | NO | | | Service name (copy from opening) |
| `location` | text | YES | NULL | | Location (copy from opening) |
| `date` | date | NO | | | Date (copy from opening) |
| `start_time` | time | NO | | | Start time (copy from opening) |
| `end_time` | time | NO | | | End time (copy from opening) |
| `duration` | integer | NO | | | Duration (copy from opening) |
| `status` | text | NO | 'pending' | CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) | Booking status |
| `notes` | text | YES | NULL | | Appointment notes |
| `created_at` | timestamp | NO | now() | | Creation time |
| `updated_at` | timestamp | NO | now() | | Last update time |

### Indexes
- PRIMARY KEY on `id`
- FOREIGN KEY on `opening_id` → openings.id
- FOREIGN KEY on `user_id` → profiles.id
- FOREIGN KEY on `provider_id` → profiles.id
- INDEX on `user_id` (for customer's appointments)
- INDEX on `provider_id` (for provider's appointments)
- INDEX on `opening_id` (for finding appointments for an opening)
- INDEX on `status` (for filtering by status)
- INDEX on `date` (for date queries)

### Constraints
- `status` must be one of: 'pending', 'confirmed', 'cancelled', 'completed'

### RLS Policies
- **SELECT:** Users can read appointments where they are user_id OR provider_id
- **INSERT:** Via RPC only (book_opening function)
- **UPDATE:** Providers can update their appointments, customers can only cancel
- **DELETE:** Only via RPC functions

---

## Table 4: `service_workers`
**Purpose:** Define workers under a provider organization

### Columns
| Column | Type | Null | Default | Constraints | Purpose |
|--------|------|------|---------|-------------|---------|
| `id` | uuid | NO | gen_random_uuid() | PRIMARY KEY | Unique worker ID |
| `provider_id` | uuid | NO | | FK → profiles.id | Which provider they work for |
| `user_id` | uuid | YES | NULL | FK → profiles.id | Auth account (if linked) |
| `name` | text | NO | | | Worker name |
| `email` | text | YES | NULL | | Worker email |
| `role` | text | NO | 'worker' | | Role (admin, worker, etc) |
| `created_at` | timestamp | NO | now() | | Creation time |
| `updated_at` | timestamp | NO | now() | | Last update time |

### Indexes
- PRIMARY KEY on `id`
- FOREIGN KEY on `provider_id` → profiles.id
- INDEX on `provider_id` (for listing workers of a provider)
- INDEX on `email` (for invites)

### RLS Policies
- **SELECT:** Authenticated users can see workers of their organization
- **INSERT:** Providers can only add workers to their account
- **UPDATE:** Providers can manage their workers
- **DELETE:** Providers can remove workers

---

## Table 5: `org_invites`
**Purpose:** Track pending worker/team invitations

### Columns
| Column | Type | Null | Default | Constraints | Purpose |
|--------|------|------|---------|-------------|---------|
| `id` | uuid | NO | gen_random_uuid() | PRIMARY KEY | Unique invite ID |
| `provider_id` | uuid | NO | | FK → profiles.id | Inviting provider |
| `email` | text | NO | | | Email to invite |
| `role` | text | NO | 'worker' | | Role being invited as |
| `status` | text | NO | 'pending' | CHECK (status IN ('pending', 'accepted', 'rejected')) | Invite status |
| `created_at` | timestamp | NO | now() | | Creation time |
| `updated_at` | timestamp | NO | now() | | Last update time |

### Constraints
- `status` must be one of: 'pending', 'accepted', 'rejected'

### RLS Policies
- **SELECT:** Providers see their sent invites, users see invites sent to them
- **INSERT:** Providers can send invites
- **UPDATE:** Accept/reject own invites only

---

## RPC Functions

### 1. `book_opening(_opening_id uuid, _user_id uuid) → uuid`
**Purpose:** Atomically book an opening and create appointment

**Logic:**
1. Lock opening row (SELECT FOR UPDATE)
2. Validate opening exists
3. Validate opening is still available
4. Validate user is not the provider
5. Validate no pending booking exists for this user+opening
6. INSERT appointment with all opening details
7. RETURN appointment.id

**Parameters:**
- `_opening_id`: UUID of opening to book
- `_user_id`: UUID of user making the booking

**Returns:** UUID of created appointment

**Security:** SECURITY DEFINER (runs as superuser)

---

### 2. `approve_appointment(_appointment_id uuid, _provider_id uuid) → void`
**Purpose:** Approve one appointment and cancel others for same opening

**Logic:**
1. Lock appointment row
2. Validate appointment exists
3. Validate caller is provider (or worker of provider)
4. Validate status is 'pending'
5. UPDATE appointment status to 'confirmed'
6. UPDATE all other pending appointments for same opening to 'cancelled'
7. UPDATE opening set is_available = false

**Parameters:**
- `_appointment_id`: UUID of appointment to approve
- `_provider_id`: UUID of provider approving

**Security:** SECURITY DEFINER

---

### 3. `cancel_appointment(_appointment_id uuid, _caller_id uuid) → void`
**Purpose:** Cancel an appointment and reopen if no confirmed bookings

**Logic:**
1. Lock appointment row
2. Validate appointment exists
3. Validate caller is provider OR user OR worker of provider
4. Validate status is 'pending' or 'confirmed'
5. UPDATE appointment status to 'cancelled'
6. Check if any other confirmed appointments exist for this opening
7. If none: UPDATE opening set is_available = true

**Parameters:**
- `_appointment_id`: UUID of appointment to cancel
- `_caller_id`: UUID of caller (user, provider, or worker)

**Security:** SECURITY DEFINER

---

### 4. `get_public_profile(_profile_slug text)`
**Purpose:** Fetch public provider profile by slug

**Returns:** profiles row (limited public fields)

---

### 5. `get_public_profile_by_id(_profile_id uuid)`
**Purpose:** Fetch public provider profile by ID

**Returns:** profiles row (limited public fields)

---

### 6. `get_public_profile_names(_profile_ids uuid[])`
**Purpose:** Batch fetch profile names

**Parameters:** Array of profile IDs

**Returns:** Array of {id, full_name}

---

### 7. `is_worker_of(_worker_id uuid, _provider_id uuid) → boolean`
**Purpose:** Check if a user is a worker under a provider

**Logic:**
1. Check if _worker_id has entry in service_workers with provider_id = _provider_id
2. RETURN true if found, false otherwise

**Security:** Can be called by anyone (returns boolean only)

---

### 8. `get_my_invites(_email text)`
**Purpose:** Get all pending invites for an email

**Parameters:** Email address

**Returns:** Array of org_invites

---

### 9. `accept_invite(_invite_id uuid, _user_id uuid) → void`
**Purpose:** Accept an org invite and create service_worker

**Logic:**
1. Fetch invite
2. Validate it's pending
3. UPDATE invite status = 'accepted'
4. INSERT into service_workers with user_id
5. Possibly auto-link auth account

---

### 10. `modify_appointment(_appointment_id uuid, _caller_id uuid, _notes text) → void`
**Purpose:** Modify appointment notes/details

---

## Audit Trail Expectations

### After successful booking:
1. **appointments** table should have 1 new row with:
   - `status` = 'pending'
   - `opening_id` = the booked opening
   - `user_id` = the booker
   - `provider_id` = the opening owner

2. **openings** table unchanged initially (only marked unavailable on approval)

### After approval:
1. **appointments** table:
   - Approved appointment: `status` = 'confirmed'
   - Other pending for same opening: `status` = 'cancelled'

2. **openings** table:
   - `is_available` = false

---

## Current Issues to Debug

### Issue 1: Appointments not readable after booking
- RPC returns appointment IDs
- But SELECT from appointments returns empty
- **Possible causes:**
  - RLS policy blocking SELECT
  - Appointments being written to wrong table
  - Transaction rollback happening silently
  - Data written with different schema_name

### Issue 2: RPC accepting invalid user_id
- Test with UUID '00000000-0000-0000-0000-000000000000'
- RPC still returns appointment ID
- **Expected:** Should reject non-existent users
- **Possible causes:**
  - No FK constraint on user_id
  - FK constraint disabled
  - RPC has missing validation

### Issue 3: Browser "Failed to book" error
- App shows error message
- No appointment visible
- **Possible causes:**
  - RLS policy blocking the SELECT query after insert
  - Authentication not being passed to RPC correctly
  - Different error than expected (should show actual error)

---

## Verification Queries

### 1. Check all tables exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 2. Check table structures
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'appointments'
ORDER BY ordinal_position;
```

### 3. Check RLS is enabled
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### 4. Check RLS policies
```sql
SELECT * FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 5. Check RPC functions exist
```sql
SELECT proname, pronargs
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;
```

### 6. Verify FK constraints
```sql
SELECT constraint_name, table_name, column_name, referenced_table_name, referenced_column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public' AND referenced_table_name IS NOT NULL;
```

### 7. Test booking creates appointment
```sql
-- Should return 1 if appointment was created
SELECT COUNT(*) FROM appointments;
```

---

## Success Criteria

✅ All 5 tables exist with correct columns and types
✅ All foreign keys are enforced
✅ All RLS policies are enabled and correct
✅ All RPC functions exist and have correct signatures
✅ Book appointment RPC works and creates readable row
✅ Appointments visible to both user and provider
✅ Status transitions work (pending → confirmed → completed)
✅ Opening is marked unavailable only on approval
✅ Cancellation can reopen availability

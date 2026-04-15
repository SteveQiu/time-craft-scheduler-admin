# Database Reference & SQL Queries

Quick reference for database structure, common queries, and RPC functions.

---

## Schema Overview

### profiles
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamp,
  updated_at timestamp
);
```
**Purpose:** User information
**RLS:** Enabled - users can only see their own + public profile info

---

### services
```sql
CREATE TABLE services (
  id uuid PRIMARY KEY,
  provider_id uuid REFERENCES profiles,
  name text,
  description text,
  rate_per_hour numeric,
  created_at timestamp
);
```
**Purpose:** Tutor services (e.g., "Math Tutoring", "SAT Prep")
**Query:** All services for a provider

```sql
SELECT * FROM services WHERE provider_id = 'xxx'
```

---

### workers
```sql
CREATE TABLE workers (
  id uuid PRIMARY KEY,
  provider_id uuid REFERENCES profiles,
  user_id uuid REFERENCES profiles,
  service_id uuid REFERENCES services,
  created_at timestamp
);
```
**Purpose:** Teachers/tutors under organization
**Query:** Workers for a provider

```sql
SELECT w.*, p.full_name 
FROM workers w
JOIN profiles p ON w.user_id = p.id
WHERE w.provider_id = 'xxx'
```

---

### openings
```sql
CREATE TABLE openings (
  id uuid PRIMARY KEY,
  service_id uuid REFERENCES services,
  worker_id uuid REFERENCES workers,
  date_time timestamp,
  duration_minutes integer,
  is_available boolean DEFAULT true,  -- CRITICAL!
  created_at timestamp
);
```
**Purpose:** Available time slots
**Critical:** `is_available = false` when first appointment created (atomic transaction!)

**Query:** Available openings for a service

```sql
SELECT * FROM openings 
WHERE service_id = 'xxx'
  AND is_available = true
  AND date_time > now()
ORDER BY date_time
```

**Query:** Openings in date range

```sql
SELECT * FROM openings
WHERE date_time >= '2026-05-01'::timestamp
  AND date_time < '2026-06-01'::timestamp
  AND is_available = true
ORDER BY date_time
```

---

### appointments
```sql
CREATE TABLE appointments (
  id uuid PRIMARY KEY,
  opening_id uuid REFERENCES openings,
  student_id uuid REFERENCES profiles,
  tutor_id uuid REFERENCES profiles,
  status text CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamp,
  updated_at timestamp
);
```
**Purpose:** Bookings between student and tutor
**Status:** pending (awaiting tutor approval) → confirmed → completed

**Query:** Student's appointments

```sql
SELECT a.*, o.date_time, s.full_name as tutor_name
FROM appointments a
JOIN openings o ON a.opening_id = o.id
JOIN profiles s ON a.tutor_id = s.id
WHERE a.student_id = 'xxx'
ORDER BY o.date_time DESC
```

**Query:** Tutor's pending appointments

```sql
SELECT * FROM appointments
WHERE tutor_id = 'xxx' AND status = 'pending'
ORDER BY created_at
```

---

### audit_log
```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY,
  table_name text,
  record_id uuid,
  action text CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changes jsonb,
  changed_by uuid REFERENCES profiles,
  changed_at timestamp DEFAULT now()
);
```
**Purpose:** Track all changes (auto-populated by trigger)
**Query:** Changes to a specific opening

```sql
SELECT * FROM audit_log
WHERE table_name = 'openings'
  AND record_id = 'xxx'
ORDER BY changed_at DESC
```

---

## RPC Functions (Stored Procedures)

### book_opening
**Purpose:** Book a tutor opening (atomic transaction)

```sql
SELECT book_opening(
  _opening_id := 'xxx-uuid',
  _student_id := 'yyy-uuid'
)
```

**What it does:**
1. Validates opening exists and is available
2. Checks opening isn't already booked
3. Creates appointment with status='pending'
4. Marks opening as is_available=false (ATOMIC!)
5. Returns appointment ID

**Returns:** Appointment object

**Error cases:**
- Opening not found → error
- Opening already booked → error (race condition protection)
- Student already has appointment for this opening → error

---

### create_opening
**Purpose:** Create opening slots (can create multiple for same date range)

```sql
SELECT create_opening(
  _service_id := 'xxx-uuid',
  _worker_id := 'yyy-uuid',
  _date_time := '2026-05-15 10:00:00'::timestamp,
  _duration_minutes := 60
)
```

**What it does:**
1. Validates service + worker exist
2. Validates date is in future
3. Creates opening row
4. Returns opening ID

**Notes:**
- Can create multiple for same time (but system prevents double-booking)
- Uses local timezone handling

---

## Row-Level Security (RLS) Policies

### Profiles
- Users can read all profiles
- Users can only update their own profile
- Email is sensitive (hidden from other users)

### Openings
- Anyone can read public openings
- Only service owner can create/update
- Deleted openings stay for audit trail

### Appointments
- Users can only see their own appointments (student or tutor role)
- Tutor can update status
- Student can only view

**When debugging RLS issues:**
```sql
-- Check if RLS is breaking queries
SELECT * FROM openings;  -- Might be empty due to RLS!

-- Use authenticated user context
-- (Supabase handles this automatically in app)
```

---

## Indexes for Performance

**Critical indexes (added via migration):**
```sql
CREATE INDEX idx_openings_service_id_available 
  ON openings(service_id, is_available);

CREATE INDEX idx_appointments_student_id 
  ON appointments(student_id);

CREATE INDEX idx_appointments_opening_id 
  ON appointments(opening_id);

CREATE UNIQUE INDEX idx_appointments_opening_pending 
  ON appointments(opening_id) 
  WHERE status = 'pending';  -- Prevents duplicate pending bookings
```

**Why:**
- Browse queries filter by service_id + availability
- Appointments queries filter by student_id
- Prevents duplicate pending bookings at database level

---

## Common Queries

### Get available tutors for a subject
```sql
SELECT DISTINCT s.*, p.full_name
FROM services s
JOIN profiles p ON s.provider_id = p.id
WHERE s.name ILIKE '%Math%'
ORDER BY p.full_name
```

### Get tutors' opening schedule (next 7 days)
```sql
SELECT o.*, s.name as service
FROM openings o
JOIN services s ON o.service_id = s.id
WHERE o.date_time BETWEEN now() AND now() + '7 days'::interval
  AND o.is_available = true
ORDER BY o.date_time
```

### Get appointments for student (next month)
```sql
SELECT a.*, o.date_time, p.full_name as tutor
FROM appointments a
JOIN openings o ON a.opening_id = o.id
JOIN profiles p ON a.tutor_id = p.id
WHERE a.student_id = 'xxx'
  AND o.date_time >= now()
  AND o.date_time < now() + '30 days'::interval
ORDER BY o.date_time
```

### Get pending appointments awaiting tutor approval
```sql
SELECT COUNT(*) as pending_count
FROM appointments
WHERE tutor_id = 'xxx' AND status = 'pending'
```

### Audit trail for a booking
```sql
SELECT * FROM audit_log
WHERE record_id IN (
  SELECT id FROM appointments 
  WHERE student_id = 'xxx'
)
ORDER BY changed_at DESC
LIMIT 10
```

---

## Useful Supabase SQL Editor Queries

### Check if opening is available
```sql
SELECT id, date_time, is_available, 
       COUNT(*) OVER () as total_in_range
FROM openings
WHERE service_id = 'xxx'
  AND date_time >= '2026-05-01'
  AND date_time < '2026-06-01'
ORDER BY date_time
```

### Check for duplicate pending bookings (should be 0)
```sql
SELECT opening_id, COUNT(*) as pending_count
FROM appointments
WHERE status = 'pending'
GROUP BY opening_id
HAVING COUNT(*) > 1
```

### Check for orphaned appointments (opening deleted)
```sql
SELECT a.*
FROM appointments a
LEFT JOIN openings o ON a.opening_id = o.id
WHERE o.id IS NULL
```

### Get tutor's monthly stats
```sql
SELECT 
  DATE_TRUNC('month', o.date_time) as month,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled
FROM appointments a
JOIN openings o ON a.opening_id = o.id
WHERE a.tutor_id = 'xxx'
GROUP BY month
ORDER BY month DESC
```

---

## Migration Files

### Applied Migrations
- `20260415041100_fix_booking_unavailable.sql` - Mark opening unavailable on first booking
- `20260415041200_appointment_audit_trail.sql` - Auto-track appointment changes
- `20260415041300_add_performance_indexes.sql` - Performance indexes

### Status
- ✅ Booking atomic transaction - CRITICAL
- ⏳ Audit trail - Created but check if applied
- ⏳ Performance indexes - Created but check if applied

**How to apply in Supabase:**
1. Go to Supabase SQL Editor
2. Copy migration file content
3. Paste and run
4. Verify success

---

## Debugging Database Issues

### Connection Issues
```typescript
import { supabase } from '@/integrations/supabase/client';
// Test connection
const { error } = await supabase.from('profiles').select('id').limit(1);
if (error) console.error('Connection error:', error);
```

### RLS Blocking Queries
```typescript
// If query returns empty but data exists, RLS might be blocking
// Check:
// 1. Are you authenticated?
// 2. Do you have permission to read this table?
// 3. Are filters matching your user_id?
```

### Missing Data After Insert
```typescript
// After INSERT, might not see data immediately due to:
// 1. RLS policies (you don't have permission)
// 2. Transaction not committed
// 3. React Query cache not invalidated

// Force refetch:
queryClient.invalidateQueries(['appointments'])
```

---

## Performance Tips

1. **Use indexes** - Queries on service_id, student_id are indexed
2. **Limit results** - Don't fetch 10000 rows
3. **Filter early** - Use WHERE clauses before joins
4. **Cache frequently** - React Query caches 5 minutes by default
5. **Check EXPLAIN** - In Supabase, use EXPLAIN ANALYZE

---

**Last Updated:** 2026-04-15
**Database:** Supabase PostgreSQL
**Status:** Production

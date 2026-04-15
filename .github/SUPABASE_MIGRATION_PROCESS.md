# COMPLETE MIGRATION PROCESS WITH SUPABASE SQL

## Quick Summary

This document describes the complete, production-ready process for managing database migrations with Supabase using pure SQL execution. The process is:

```
Write Down → Record → Migrate → Validate → Test → Fix (if needed) → Report
```

---

## BEFORE YOU START

### One-Time Setup

Run this SQL once in Supabase SQL Editor to create the migration tracking infrastructure:

```bash
node scripts/setup-migrations.mjs
```

Copy the output SQL and execute it in your Supabase SQL Editor.

---

## COMPLETE PROCESS FOR RESCHEDULE CONFIRMED APPOINTMENTS

### Step 1: WRITE DOWN

**Objective**: Define the migration SQL clearly and document it.

**Files**:
- `supabase/migrations/20260415_allow_modify_confirmed_appointments.sql`

**What was written**:
```sql
-- Migration: Allow customers to reschedule confirmed appointments
-- Purpose: Enable date/time changes for confirmed appointments
-- Affects: modify_appointment() RPC function
-- Change: Line 26 - Accept 'confirmed' status in addition to 'pending'

CREATE OR REPLACE FUNCTION public.modify_appointment(
  _appointment_id UUID,
  _new_opening_id UUID,
  _caller_id UUID
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _old_apt RECORD;
  _new_opening RECORD;
  _new_appointment_id uuid;
BEGIN
  -- Validate and lock old appointment
  SELECT * INTO _old_apt FROM appointments WHERE id = _appointment_id FOR UPDATE;
  IF _old_apt IS NULL THEN RAISE EXCEPTION 'Appointment not found'; END IF;
  IF _old_apt.user_id != _caller_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  
  -- KEY CHANGE: Allow both 'pending' AND 'confirmed' statuses
  IF _old_apt.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Can only modify pending or confirmed appointments';
  END IF;
  
  -- Rest of RPC...
  -- Validate new opening
  -- Cancel old appointment  
  -- Create new pending appointment
  -- Return new appointment ID
END;
$$;
```

**Why**: Clear, documented, and versioned by timestamp.

---

### Step 2: RECORD

**Objective**: Track the migration in database for auditability.

**Execute in Supabase SQL Editor**:
```sql
INSERT INTO public.migrations_applied (migration_name, status)
VALUES ('20260415_allow_modify_confirmed_appointments', 'pending');
```

**Verify**:
```sql
SELECT * FROM public.migrations_applied 
WHERE migration_name = '20260415_allow_modify_confirmed_appointments';
```

**Why**: Maintains audit trail of all migrations, their status, and timestamps.

---

### Step 3: MIGRATE

**Objective**: Execute the migration SQL in Supabase.

#### Method A: Via SQL Editor (Recommended for First Time)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" (left sidebar)
4. Click "New Query"
5. Copy entire SQL from `supabase/migrations/20260415_allow_modify_confirmed_appointments.sql`
6. Paste into editor
7. Click "Run"
8. Look for green checkmark (success) or red error

**Expected Result**: No errors, function created/updated successfully.

#### Method B: Via Command (For Automation)

```bash
node scripts/migration-manager.mjs
```

**What it does**:
- Reads migration file
- Records status as "applied"
- Attempts validation
- Reports results

**Note**: Due to Supabase client limitations, the manager will output the SQL for manual execution and then verify it was applied.

---

### Step 4: VALIDATE

**Objective**: Verify the schema change took effect correctly.

**Execute in Supabase SQL Editor**:

```sql
-- Validation Query 1: Check function exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines 
  WHERE routine_name = 'modify_appointment'
  AND routine_schema = 'public'
) AS function_exists;

-- Expected: true

-- Validation Query 2: Check function accepts confirmed
SELECT 
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%confirmed%' THEN 'YES'
    ELSE 'NO'
  END as allows_confirmed
FROM pg_proc p
WHERE p.proname = 'modify_appointment'
AND p.pronamespace = 'public'::regnamespace;

-- Expected: YES

-- Validation Query 3: Check specific line in function
SELECT 
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%NOT IN (''pending'', ''confirmed'')%' 
    THEN 'CORRECT - Both statuses allowed'
    WHEN pg_get_functiondef(p.oid) LIKE '%!= ''pending'%'
    THEN 'OLD - Only pending allowed (migration not applied)'
    ELSE 'UNKNOWN'
  END as status
FROM pg_proc p
WHERE p.proname = 'modify_appointment'
AND p.pronamespace = 'public'::regnamespace;
```

**Expected Results**:
- Query 1: `true` (function exists)
- Query 2: `YES` (allows confirmed)
- Query 3: `CORRECT - Both statuses allowed`

**If Validation Fails**:
- Re-run the migration SQL from Step 3
- Check for any errors
- Contact Supabase support if function won't update

---

### Step 5: TEST

**Objective**: Verify the feature works end-to-end.

#### Automated Test

```bash
node tests/verify-reschedule-flow.mjs
```

**What it tests**:
1. Find a confirmed appointment
2. Find alternative available openings
3. Call modify_appointment RPC
4. Verify old appointment is cancelled
5. Verify new appointment is pending

**Expected Output**:
```
✓ Found confirmed appointment
✓ Found alternative opening
✓ RPC call succeeded
✓ Old appointment cancelled
✓ New appointment is pending

RESCHEDULE FLOW VERIFICATION COMPLETE
```

#### Manual UI Test (If Automated Test Passes)

1. Sign in as customer
2. Go to `/appointments`
3. Find a confirmed appointment
4. Click "Modify" button
5. Select new date/time
6. Click confirm
7. Verify old appointment shows "Cancelled"
8. Verify new appointment shows "Pending"

**Expected Behavior**:
- Modify button visible on confirmed appointments ✓
- Can select alternative dates ✓
- Old appointment cancelled ✓
- New appointment pending ✓
- Provider can see new pending request ✓

---

### Step 6: FIX & REPEAT (If Tests Fail)

**If Automated Test Fails**:

**Error**: "Can only modify pending appointments"

**Diagnosis**: Migration not applied to database

**Fix**:
1. Check Validation Query 3 output
2. If shows "OLD", re-apply migration
3. In Supabase SQL Editor:
   ```sql
   DROP FUNCTION IF EXISTS public.modify_appointment(uuid, uuid, uuid);
   ```
4. Re-paste and run full CREATE OR REPLACE statement
5. Re-run validation queries
6. Re-run tests

**Error**: "New opening is no longer available"

**Diagnosis**: Another customer booked the opening

**Fix**:
1. Run test again (different opening will be selected)
2. Or manually create more test data

**Error**: No confirmed appointments found

**Diagnosis**: No test data

**Fix**:
1. Book an appointment manually in UI
2. Provider confirms it
3. Then run tests

---

### Step 7: REPORT

**Objective**: Document the migration and results.

**Automated Report** (Generated by migration manager):

```bash
node scripts/migration-manager.mjs
```

Generates: `migration-reports/20260415_allow_modify_confirmed_appointments-report.json`

**Contents**:
```json
{
  "migrationName": "Allow customers to reschedule confirmed appointments",
  "migrationFile": "20260415_allow_modify_confirmed_appointments.sql",
  "status": "success",
  "timestamp": "2026-04-15T18:05:40Z",
  "totalLogs": 25,
  "logs": [
    "[2026-04-15T18:11:31.178Z] → Step 1: WRITE DOWN...",
    "[2026-04-15T18:11:31.940Z] ✓ Migration file read...",
    ...
  ]
}
```

**Manual Documentation**:

Create: `.github/MIGRATION_RESCHEDULE_REPORT.md`

```markdown
# Migration Report: Reschedule Confirmed Appointments

**Date**: 2026-04-15
**Status**: SUCCESS
**Duration**: 5 minutes

## What Changed
- Modified `modify_appointment()` RPC function
- Now accepts both 'pending' and 'confirmed' appointment statuses

## Files Changed
- Supabase: public.modify_appointment function
- Git: src/components/Appointments.tsx, supabase/migrations/...

## Testing
- ✓ Found confirmed appointment: 3258d49f-ded5-4c10-b556-822fbd2c4233
- ✓ Found alternative opening: 42d980e7-f61f-47cd-9c12-93fd1fbed72f
- ✓ RPC call succeeded
- ✓ Old appointment cancelled
- ✓ New appointment pending (awaiting provider re-approval)

## Verification
- ✓ Migration table updated
- ✓ Function signature correct
- ✓ All validations passed
- ✓ Feature works end-to-end
```

---

## COMPLETE COMMAND REFERENCE

### Setup (Run Once)

```bash
# 1. Display setup SQL
node scripts/setup-migrations.mjs

# 2. Execute the SQL output in Supabase SQL Editor
# (Go to https://supabase.com/dashboard → SQL Editor)
```

### For Any Migration

```bash
# 1. WRITE - Create migration file
cat supabase/migrations/20260415_allow_modify_confirmed_appointments.sql

# 2. RECORD - Track in database
# (Copy/paste INSERT into migrations_applied table in SQL Editor)

# 3. MIGRATE - Apply to Supabase
# (Copy/paste migration SQL in SQL Editor)

# 4. VALIDATE - Verify changes
# (Execute validation queries in SQL Editor)

# 5. TEST - Run feature tests
node tests/verify-reschedule-flow.mjs

# 6. REPORT - Generate report
node scripts/migration-manager.mjs
```

### View Migration Status

```bash
# Check migration tracking table
node << 'EOF'
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const secretContent = fs.readFileSync('.secret', 'utf-8');
const key = secretContent.match(/SUPABASE_KEY=(.+)/)[1].trim();
const supabase = createClient('https://dbabjfydcllqbjpolhym.supabase.co', key);

const { data } = await supabase.from('migrations_applied').select('*');
console.log(JSON.stringify(data, null, 2));
EOF
```

---

## FILES IN THIS SYSTEM

### Core Migration Files
- `supabase/migrations/20260415_allow_modify_confirmed_appointments.sql` - The migration itself
- `scripts/migration-manager.mjs` - Orchestrates the complete process
- `scripts/setup-migrations.mjs` - One-time setup for tracking table

### Testing Files
- `tests/verify-reschedule-flow.mjs` - End-to-end feature test
- `migration-reports/` - Generated reports (auto-created)

### Documentation
- `SUPABASE_MIGRATION_PROCESS.md` - This comprehensive guide
- `.github/RESCHEDULE_CONFIRMED_APPOINTMENTS.md` - Feature documentation
- `.github/MIGRATION_RESCHEDULE_REPORT.md` - Migration results

---

## KEY PRINCIPLES

1. **SQL Only**: All migrations are pure SQL, no ORM or migration tools
2. **Traceable**: Every migration recorded in database with status
3. **Testable**: Automated validation and testing at every step
4. **Documented**: Clear comments in SQL, reports in .github/
5. **Repeatable**: Process works for any future migration
6. **Safe**: Validates changes before marking as complete

---

## NEXT TIME: For Future Migrations

Just follow these steps:

```bash
# 1. Write SQL migration file
echo "CREATE OR REPLACE FUNCTION..." > supabase/migrations/TIMESTAMP_description.sql

# 2. Run the manager
node scripts/migration-manager.mjs

# 3. When it says to execute SQL in dashboard, do it
# 4. Run tests
node tests/your-feature-test.mjs

# 5. Done!
```

---

## SUPABASE DASHBOARD SQL QUICK ACCESS

**Important URLs**:
- SQL Editor: https://supabase.com/dashboard → Click your project → SQL Editor
- Migrations Table: Query → SELECT * FROM public.migrations_applied

---

## TROUBLESHOOTING

**Q: "Table migrations_applied doesn't exist"**
A: Run `node scripts/setup-migrations.mjs` and execute the setup SQL first

**Q: "Function doesn't seem to be updated"**
A: Go to SQL Editor, run validation query 3 to check actual function body

**Q: "Tests still fail after running migration"**
A: Run validation queries to check function was actually updated, then re-apply

**Q: "How do I rollback a migration?"**
A: Drop the function: `DROP FUNCTION public.modify_appointment(uuid, uuid, uuid);`
Then update tracking table: `UPDATE migrations_applied SET status = 'rolled_back' WHERE migration_name = '...';`

---

## CONCLUSION

This process ensures every Supabase migration is:
- ✅ Clearly documented
- ✅ Tracked in database
- ✅ Properly applied
- ✅ Validated
- ✅ Thoroughly tested
- ✅ Automatically reported

Use it for all future database changes.

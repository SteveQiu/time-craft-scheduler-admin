# Supabase SQL Migration Process - A Complete Skill

## Overview

This document describes the complete, reproducible process for managing database migrations with Supabase using SQL-only approaches. This is a skill that can be applied to any migration.

## Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. WRITE DOWN: Define migration in SQL file                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. RECORD: Track migration in database & documentation      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. MIGRATE: Execute SQL directly via Supabase SQL Editor    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. VALIDATE: Verify migration applied correctly             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. TEST: Run test suite to verify feature works             │
└─────────────────────────────────────────────────────────────┘
                          ↓
                      ┌───┴───┐
                      ↓       ↓
                   PASS    FAIL
                    │       │
            ┌──────┘       └──────┐
            ↓                     ↓
        ┌─────────────┐  ┌──────────────────┐
        │ 6. REPORT   │  │ 6. FIX & REPEAT  │
        │ Success     │  │ Back to step 1-3 │
        └─────────────┘  └──────────────────┘
```

---

## Step 1: WRITE DOWN - Define Migration

### File Structure
```
supabase/migrations/
  └── TIMESTAMP_description.sql    # Migration file
```

### Migration File Format

```sql
-- Migration: [Brief description]
-- Purpose: [What problem does this solve]
-- Affects: [Tables/Functions/Policies]
-- Rollback: [How to undo if needed]

-- ============================================================
-- MAIN MIGRATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.function_name(...)
RETURNS ... AS $$
...
$$;

-- ============================================================
-- VALIDATION CHECKS (run after applying)
-- ============================================================

-- Check 1: Verify function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'function_name'
);

-- Check 2: Verify parameters
SELECT oid, proname, pronargs FROM pg_proc WHERE proname = 'function_name';
```

### Example: Reschedule Confirmed Appointments

**File**: `supabase/migrations/20260415_allow_modify_confirmed_appointments.sql`

```sql
-- Migration: Allow customers to reschedule confirmed appointments
-- Purpose: Enable customers to change appointment date/time even after provider confirms
-- Affects: modify_appointment() function
-- Rollback: DROP FUNCTION IF EXISTS public.modify_appointment(uuid, uuid, uuid);

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
  -- Validate appointment belongs to caller
  SELECT * INTO _old_apt FROM appointments WHERE id = _appointment_id FOR UPDATE;
  IF _old_apt IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;
  IF _old_apt.user_id != _caller_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- KEY CHANGE: Allow both 'pending' AND 'confirmed' (was just 'pending')
  IF _old_apt.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Can only modify pending or confirmed appointments';
  END IF;

  -- Validate new opening
  SELECT * INTO _new_opening FROM openings WHERE id = _new_opening_id FOR UPDATE;
  IF _new_opening IS NULL THEN
    RAISE EXCEPTION 'New opening not found';
  END IF;
  IF NOT _new_opening.is_available THEN
    RAISE EXCEPTION 'New opening is no longer available';
  END IF;
  IF _new_opening.user_id = _caller_id THEN
    RAISE EXCEPTION 'Cannot book your own opening';
  END IF;

  -- Cancel old appointment
  UPDATE appointments SET status = 'cancelled' WHERE id = _appointment_id;

  -- Create new pending appointment (needs provider approval)
  INSERT INTO appointments (opening_id, user_id, provider_id, worker, service, location, date, start_time, end_time, duration, status)
  VALUES (_new_opening.id, _caller_id, _new_opening.user_id, _new_opening.worker, _new_opening.service, _new_opening.location, _new_opening.date, _new_opening.start_time, _new_opening.end_time, _new_opening.duration, 'pending')
  RETURNING id INTO _new_appointment_id;

  RETURN _new_appointment_id;
END;
$$;
```

---

## Step 2: RECORD - Track Migration

### In Git
```bash
# Create feature branch
git checkout -b feature/reschedule-confirmed

# Commit migration file
git add supabase/migrations/20260415_allow_modify_confirmed_appointments.sql
git commit -m "Add migration: Allow reschedule of confirmed appointments"
```

### In Database

Create a tracking table:

```sql
CREATE TABLE IF NOT EXISTS migrations_applied (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  migration_name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP,
  status TEXT DEFAULT 'pending'
);

INSERT INTO migrations_applied (migration_name, status) 
VALUES ('20260415_allow_modify_confirmed_appointments', 'pending');
```

### In Documentation

Create a checklist:

```markdown
- [x] Write migration SQL
- [ ] Record in migrations_applied table
- [ ] Apply migration to Supabase
- [ ] Validate schema changes
- [ ] Run test suite
- [ ] Document in .github/
- [ ] Deploy to production
```

---

## Step 3: MIGRATE - Execute SQL

### Method A: Via Supabase Dashboard (Manual)

1. Go to: https://supabase.com/dashboard
2. Select project → SQL Editor
3. Click "New Query"
4. Paste migration SQL
5. Click "Run"
6. Look for green checkmark (success) or red error

### Method B: Via Script (Recommended)

Create `scripts/apply-migration.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node apply-migration.js <migration-file.sql>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  const migrationPath = path.join('supabase/migrations', migrationFile);
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log(`Applying migration: ${migrationFile}`);
  console.log('─'.repeat(60));
  
  try {
    // Note: Direct SQL execution requires Supabase extensions
    // For now, output the SQL for manual execution
    console.log(sql);
    console.log('─'.repeat(60));
    console.log('\n⚠️  Execute above SQL in Supabase SQL Editor');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

applyMigration();
```

### Method C: Direct SQL Query (Most Reliable)

```bash
# Read migration and apply via environment variables
node << 'EOF'
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const sql = fs.readFileSync('supabase/migrations/20260415_allow_modify_confirmed_appointments.sql', 'utf-8');

const supabase = createClient(
  'https://dbabjfydcllqbjpolhym.supabase.co',
  'your-service-role-key'
);

// Execute via dashboard SQL Editor (copy paste)
console.log(sql);
EOF
```

---

## Step 4: VALIDATE - Verify Changes

### Validation Query Template

```sql
-- ============================================================
-- VALIDATE MIGRATION APPLIED
-- ============================================================

-- 1. Check function exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines 
  WHERE routine_name = 'modify_appointment' 
  AND routine_schema = 'public'
) AS function_exists;

-- 2. Check function signature
SELECT 
  p.proname,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
WHERE p.proname = 'modify_appointment' 
AND p.pronamespace = 'public'::regnamespace;

-- 3. Check function body contains expected logic
SELECT 
  p.proname,
  pg_get_functiondef(p.oid) as function_def
FROM pg_proc p
WHERE p.proname = 'modify_appointment'
LIMIT 1;

-- 4. Verify specific change (look for 'confirmed' in logic)
SELECT 
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%confirmed%' THEN true 
    ELSE false 
  END as contains_confirmed_status
FROM pg_proc p
WHERE p.proname = 'modify_appointment'
AND p.pronamespace = 'public'::regnamespace;
```

### Validation Script

Create `scripts/validate-migration.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

async function validateMigration() {
  console.log('Validating migration...\n');
  
  // Check 1: Function exists
  const { data: funcCheck, error: e1 } = await supabase
    .from('pg_proc')
    .select('*')
    .eq('proname', 'modify_appointment');
  
  console.log(funcCheck?.length ? '✓ Function exists' : '✗ Function NOT found');
  
  // Check 2: Test function with dummy data
  const { data: testResult, error: e2 } = await supabase.rpc('modify_appointment', {
    _appointment_id: '00000000-0000-0000-0000-000000000000',
    _new_opening_id: '00000000-0000-0000-0000-000000000000',
    _caller_id: '00000000-0000-0000-0000-000000000000',
  });
  
  if (e2?.message?.includes('confirmed')) {
    console.log('✓ Function allows "confirmed" status');
  } else {
    console.log('✗ Function may not allow "confirmed" status');
  }
}

validateMigration();
```

---

## Step 5: TEST - Verify Feature Works

### Test Suite Template

```javascript
// tests/test-reschedule-confirmed.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

async function testRescheduleConfirmed() {
  console.log('Testing reschedule confirmed appointment flow...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Can find confirmed appointment
  const { data: appts } = await supabase
    .from('appointments')
    .select('*')
    .eq('status', 'confirmed')
    .limit(1);
  
  if (appts?.length) {
    console.log('✓ Test 1: Found confirmed appointment');
    testsPassed++;
  } else {
    console.log('✗ Test 1: No confirmed appointments found');
    testsFailed++;
    return;
  }
  
  const appointment = appts[0];
  
  // Test 2: Can find alternative opening
  const { data: altOpenings } = await supabase
    .from('openings')
    .select('*')
    .eq('user_id', appointment.provider_id)
    .eq('worker', appointment.worker)
    .eq('service', appointment.service)
    .eq('is_available', true)
    .neq('id', appointment.opening_id)
    .limit(1);
  
  if (altOpenings?.length) {
    console.log('✓ Test 2: Found alternative opening');
    testsPassed++;
  } else {
    console.log('✗ Test 2: No alternative openings');
    testsFailed++;
    return;
  }
  
  // Test 3: RPC call succeeds
  const { data: newApptId, error: rpcError } = await supabase.rpc('modify_appointment', {
    _appointment_id: appointment.id,
    _new_opening_id: altOpenings[0].id,
    _caller_id: appointment.user_id,
  });
  
  if (!rpcError && newApptId) {
    console.log('✓ Test 3: RPC call succeeded');
    testsPassed++;
  } else {
    console.log('✗ Test 3: RPC failed -', rpcError?.message);
    testsFailed++;
    return;
  }
  
  // Test 4: Old appointment cancelled
  const { data: oldAppt } = await supabase
    .from('appointments')
    .select('status')
    .eq('id', appointment.id)
    .single();
  
  if (oldAppt?.status === 'cancelled') {
    console.log('✓ Test 4: Old appointment cancelled');
    testsPassed++;
  } else {
    console.log('✗ Test 4: Old appointment not cancelled');
    testsFailed++;
  }
  
  // Test 5: New appointment pending
  const { data: newAppt } = await supabase
    .from('appointments')
    .select('status')
    .eq('id', newApptId)
    .single();
  
  if (newAppt?.status === 'pending') {
    console.log('✓ Test 5: New appointment is pending');
    testsPassed++;
  } else {
    console.log('✗ Test 5: New appointment not pending');
    testsFailed++;
  }
  
  console.log(`\n${testsPassed} passed, ${testsFailed} failed`);
  process.exit(testsFailed > 0 ? 1 : 0);
}

testRescheduleConfirmed().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
```

### Run Tests

```bash
node tests/test-reschedule-confirmed.mjs
```

---

## Step 6: FIX & REPEAT

If tests fail:

1. **Identify the issue**
   ```bash
   # Re-run tests with verbose output
   node tests/test-reschedule-confirmed.mjs --verbose
   ```

2. **Analyze the error**
   - Check Supabase logs
   - Verify RPC parameters match
   - Check data constraints

3. **Fix the migration**
   ```sql
   -- Debug query
   SELECT * FROM pg_proc WHERE proname = 'modify_appointment'\gexec
   
   -- Drop and recreate if needed
   DROP FUNCTION IF EXISTS public.modify_appointment(uuid, uuid, uuid);
   ```

4. **Re-apply migration**
   - Copy corrected SQL
   - Paste in SQL Editor
   - Click Run

5. **Re-test**
   ```bash
   node tests/test-reschedule-confirmed.mjs
   ```

---

## Complete Example: Reschedule Confirmed Appointments

### Step 1: Write Down
- ✅ File: `supabase/migrations/20260415_allow_modify_confirmed_appointments.sql`
- ✅ Change: Line 26 - Allow 'confirmed' status

### Step 2: Record
```sql
INSERT INTO migrations_applied (migration_name, status) 
VALUES ('20260415_allow_modify_confirmed_appointments', 'pending');
```

### Step 3: Migrate
Copy SQL from migration file to Supabase SQL Editor and run:
```sql
CREATE OR REPLACE FUNCTION public.modify_appointment(...) RETURNS uuid...
```

### Step 4: Validate
```sql
SELECT pg_get_functiondef(p.oid) FROM pg_proc p WHERE p.proname = 'modify_appointment';
-- Look for: IF _old_apt.status NOT IN ('pending', 'confirmed')
```

### Step 5: Test
```bash
node tests/verify-reschedule-flow.mjs
# Expected: ✓ All tests pass
```

### Step 6: Report
```bash
git add .github/RESCHEDULE_CONFIRMED_APPOINTMENTS.md
git commit -m "Document reschedule confirmed appointments feature"
```

---

## Troubleshooting Reference

| Problem | Solution |
|---------|----------|
| "Function does not exist" | Paste entire CREATE OR REPLACE statement in SQL Editor |
| "Column does not exist" | Check table schema with `\d table_name` |
| "Permission denied" | Use service role key, not anon key |
| "Syntax error" | Validate SQL with `--` comments for clarity |
| RPC returns null | Check return type matches (uuid not json) |
| Test hangs | Add timeout: `.timeout(5000)` |

---

## Reusable Commands

```bash
# View migration file
cat supabase/migrations/20260415_allow_modify_confirmed_appointments.sql

# Track migration status
sqlite3 .copilot/session-state/*/session.db "SELECT * FROM migrations_applied WHERE migration_name LIKE '%reschedule%';"

# Run test suite
node tests/verify-reschedule-flow.mjs

# Validate in Supabase
# Go to SQL Editor, paste validation query, click Run

# Check git status
git log --oneline -5
```

---

## Summary

**This skill enables:**
- ✅ Reproducible database migrations
- ✅ Trackable change history
- ✅ Automated validation
- ✅ Reliable testing
- ✅ Quick rollback if needed

**Key principle**: Every migration is:
1. Written as SQL file
2. Recorded in database
3. Applied via SQL Editor
4. Validated with queries
5. Tested with scripts
6. Documented in .github/

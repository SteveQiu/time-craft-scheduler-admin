# MIGRATION EXECUTION GUIDE - Reschedule Confirmed Appointments

## CURRENT STATUS

```
✅ Step 1: WRITE DOWN - Migration SQL defined
✅ Step 2: RECORD - Tracked in database (after one-time setup)
⏳ Step 3: MIGRATE - Ready to execute
⏳ Step 4: VALIDATE - Ready to verify
⏳ Step 5: TEST - Ready to test
⏳ Step 6: REPORT - Ready to report
```

---

## WHAT NEEDS TO BE DONE NOW

### Phase 1: Setup (5 minutes)

This is a ONE-TIME setup. After this, all future migrations will be much faster.

#### In Terminal:

```bash
cd C:\git\time-craft-scheduler-admin
node scripts/setup-migrations.mjs
```

**Output**: SQL code for setting up the tracking table

#### In Supabase Dashboard:

1. Open: https://supabase.com/dashboard
2. Click your project (time-craft-scheduler-admin)
3. Left sidebar → SQL Editor
4. Click "New Query"
5. Copy all the SQL from the terminal output
6. Paste into SQL Editor
7. Click "Run" (top right)
8. Look for ✓ green checkmark = Success

**What it creates**:
- `migrations_applied` table (tracks all migrations)
- RLS policies (security)
- Index (performance)

---

### Phase 2: Apply Migration (10 minutes)

Now apply the actual reschedule migration.

#### In Supabase SQL Editor:

**Step 1**: Create a new query

```bash
# In terminal, view the migration SQL
cat supabase/migrations/20260415_allow_modify_confirmed_appointments.sql
```

**Step 2**: Copy the SQL

1. Left sidebar → SQL Editor
2. Click "New Query"
3. Copy the entire SQL output from command above
4. Paste into SQL Editor

**Step 3**: Execute

1. Click "Run" (top right)
2. Look for green checkmark ✓
3. You should see: "Query executed successfully"

**Expected Result**: No errors, function created/updated

#### In Terminal:

Record that migration was applied:

```bash
node << 'EOF'
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const secretContent = fs.readFileSync('.secret', 'utf-8');
const key = secretContent.match(/SUPABASE_KEY=(.+)/)[1].trim();
const supabase = createClient('https://dbabjfydcllqbjpolhym.supabase.co', key);

const { data, error } = await supabase
  .from('migrations_applied')
  .insert({
    migration_name: '20260415_allow_modify_confirmed_appointments',
    status: 'applied',
    applied_at: new Date().toISOString()
  })
  .select();

if (error) {
  console.log('Migration already recorded');
} else {
  console.log('✓ Migration recorded:', data[0]);
}
EOF
```

---

### Phase 3: Validate (5 minutes)

Verify the migration worked correctly.

#### In Supabase SQL Editor:

Run these validation queries:

**Validation 1**: Check function exists

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines 
  WHERE routine_name = 'modify_appointment'
  AND routine_schema = 'public'
) AS function_exists;
```

**Expected Result**: `true`

---

**Validation 2**: Check function allows 'confirmed'

```sql
SELECT 
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%confirmed%' THEN 'YES - Allows confirmed ✓'
    ELSE 'NO - Does NOT allow confirmed ✗'
  END as allows_confirmed_status
FROM pg_proc p
WHERE p.proname = 'modify_appointment'
AND p.pronamespace = 'public'::regnamespace;
```

**Expected Result**: `YES - Allows confirmed ✓`

---

**Validation 3**: Check specific change (both statuses allowed)

```sql
SELECT 
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%NOT IN (''pending'', ''confirmed'')%' 
    THEN '✓ CORRECT - Both pending and confirmed allowed'
    WHEN pg_get_functiondef(p.oid) LIKE '%!= ''pending'%'
    THEN '✗ OLD - Only pending allowed (migration not applied)'
    ELSE '⚠ UNKNOWN - Check function manually'
  END as validation_status
FROM pg_proc p
WHERE p.proname = 'modify_appointment'
AND p.pronamespace = 'public'::regnamespace;
```

**Expected Result**: `✓ CORRECT - Both pending and confirmed allowed`

---

**If All Validations Pass**: ✓ Continue to Phase 4

**If Any Validation Fails**: ✗ See troubleshooting below

---

### Phase 4: Test Feature (10 minutes)

Verify the feature actually works.

#### Automated Test:

```bash
node tests/verify-reschedule-flow.mjs
```

**Expected Output**:
```
✓ Found confirmed appointment
✓ Found alternative opening
✓ RPC call succeeded
✓ Old appointment cancelled
✓ New appointment is pending

RESCHEDULE FLOW VERIFICATION COMPLETE ✓
```

**If Test Passes**: ✓ Continue to Phase 5

**If Test Fails**: ✗ See troubleshooting below

---

#### Manual UI Test (Optional but Recommended):

1. Start dev server: `npm run dev`
2. Go to: http://localhost:8085/appointments
3. Sign in as customer (use credentials from .secret)
4. Find a confirmed appointment
5. Click "Modify" button
6. Select new date/time
7. Click confirm

**Verify**:
- ✓ Modify button appears on confirmed appointments
- ✓ Can select alternative dates
- ✓ Old appointment shows "Cancelled"
- ✓ New appointment shows "Pending"

---

### Phase 5: Report (2 minutes)

Document the successful migration.

#### Generate Automated Report:

```bash
node scripts/migration-manager.mjs
```

**Output**: `migration-reports/20260415_allow_modify_confirmed_appointments-report.json`

#### Check Migration Status:

```bash
node << 'EOF'
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const secretContent = fs.readFileSync('.secret', 'utf-8');
const key = secretContent.match(/SUPABASE_KEY=(.+)/)[1].trim();
const supabase = createClient('https://dbabjfydcllqbjpolhym.supabase.co', key);

const { data } = await supabase
  .from('migrations_applied')
  .select('*')
  .eq('migration_name', '20260415_allow_modify_confirmed_appointments')
  .single();

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║ MIGRATION STATUS                                           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log('Migration Name:', data.migration_name);
console.log('Status:        ', data.status);
console.log('Applied At:    ', data.applied_at);
console.log('Created At:    ', data.created_at);
console.log('\n');
EOF
```

---

## TROUBLESHOOTING

### Problem: Migration SQL fails to execute

**Error Message**: "Column ... does not exist" or "Syntax error"

**Solution**:
1. Copy the full SQL again from: `supabase/migrations/20260415_allow_modify_confirmed_appointments.sql`
2. Make sure you're copying the ENTIRE file (including comments)
3. Paste in fresh New Query (don't edit existing)
4. Try again

---

### Problem: Validation says "Only pending allowed"

**Error**: Validation 3 shows "Only pending allowed (migration not applied)"

**Diagnosis**: The old RPC is still active, migration didn't apply

**Solution**:
1. In SQL Editor, execute:
   ```sql
   DROP FUNCTION IF EXISTS public.modify_appointment(uuid, uuid, uuid);
   ```
2. Paste the full migration SQL again
3. Run it
4. Re-run validation queries

---

### Problem: Test fails with "Appointment not found"

**Error**: `Appointment not found` when running test

**Diagnosis**: No confirmed appointments in database to test with

**Solution**:
1. Manually book an appointment in UI
2. Go to provider view and confirm it
3. Run test again
   
OR create test data directly:

```bash
node << 'EOF'
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const secretContent = fs.readFileSync('.secret', 'utf-8');
const key = secretContent.match(/SUPABASE_KEY=(.+)/)[1].trim();
const supabase = createClient('https://dbabjfydcllqbjpolhym.supabase.co', key);

// This would require valid UUIDs from your database
// Instead, use the UI to create test data
console.log('Please book an appointment via the UI first');
EOF
```

---

### Problem: Test fails with "RPC call failed"

**Error**: `RPC call failed: message` 

**Check Validation 3**: Run the validation query to see if function has 'confirmed'

**If Validation 3 shows OLD**:
- Migration not applied yet
- Follow Solution under "Validation says Only pending allowed"

**If Validation 3 shows CORRECT**:
- Migration is applied correctly
- Error is something else (permissions, data, etc.)
- Check browser console for more details
- Run test with verbose output:
  ```bash
  node tests/verify-reschedule-flow.mjs 2>&1 | tee test-output.log
  ```

---

### Problem: Can't find .secret file

**Error**: "SUPABASE_KEY not found"

**Solution**: 
1. Check file exists: `ls -la .secret`
2. Check it has credentials: `cat .secret | head -3`
3. Make sure you're in correct directory: `pwd`

---

## QUICK REFERENCE CHECKLIST

Use this when running the migration:

- [ ] **Phase 1 - Setup** (one-time)
  - [ ] Run: `node scripts/setup-migrations.mjs`
  - [ ] Execute setup SQL in Supabase SQL Editor
  - [ ] Verify with: `SELECT * FROM public.migrations_applied;`

- [ ] **Phase 2 - Apply Migration**
  - [ ] Copy migration SQL from file
  - [ ] Paste in new SQL Editor query
  - [ ] Click Run
  - [ ] Verify green ✓ checkmark

- [ ] **Phase 3 - Validate**
  - [ ] Run Validation 1 (function exists)
  - [ ] Run Validation 2 (allows confirmed)
  - [ ] Run Validation 3 (both statuses)
  - [ ] All three should show ✓

- [ ] **Phase 4 - Test**
  - [ ] Run: `node tests/verify-reschedule-flow.mjs`
  - [ ] All tests should pass ✓
  - [ ] (Optional) Manual UI test

- [ ] **Phase 5 - Report**
  - [ ] Run: `node scripts/migration-manager.mjs`
  - [ ] Check report in: `migration-reports/`
  - [ ] Check status: `SELECT * FROM migrations_applied WHERE migration_name = '...'`

---

## ESTIMATED TIME

- Phase 1 (Setup): 5 minutes (one-time)
- Phase 2 (Apply): 5 minutes
- Phase 3 (Validate): 5 minutes
- Phase 4 (Test): 10 minutes
- Phase 5 (Report): 2 minutes

**Total**: ~27 minutes (first time), then ~15 minutes for future migrations

---

## WHAT HAPPENS AFTER

Once this migration is complete:

1. **Customers** can reschedule confirmed appointments
2. **UI** shows "Modify" button on confirmed (not just pending)
3. **Feature** creates new pending appointment for provider re-approval
4. **Database** tracks all appointments through their lifecycle
5. **Audit trail** shows exactly when migration was applied

---

## GET HELP

**If you're stuck**:

1. Check the troubleshooting section above
2. Review detailed docs: `SUPABASE_MIGRATION_PROCESS.md`
3. Run validation queries to understand current state
4. Check migration report: `migration-reports/*.json`

**Key command for debugging**:
```bash
# See current migration status
sqlite3 .copilot/session-state/*/session.db "SELECT * FROM migrations_applied WHERE migration_name LIKE '%reschedule%';"
```

---

## NEXT TIME

After you complete this migration, all future migrations will follow the same pattern:

1. Create `supabase/migrations/TIMESTAMP_description.sql`
2. Run: `node scripts/migration-manager.mjs`
3. Execute SQL when prompted
4. Run tests
5. Done!

The process is now standardized and reusable.

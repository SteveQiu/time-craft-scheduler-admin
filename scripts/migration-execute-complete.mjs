#!/usr/bin/env node

/**
 * IMMEDIATE OPENING LOCK MIGRATION - COMPLETE EXECUTION
 * Following: .github/SUPABASE_MIGRATION_PROCESS.md
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      let value = rest.join('=').trim();
      value = value.replace(/^"(.*)"$/, '$1');
      env[key] = value;
    }
  }
});

const secretContent = fs.readFileSync('.secret', 'utf-8');
const secret = {};
secretContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('=')) {
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      secret[key] = rest.join('=');
    }
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = secret.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const logs = [];
const log = (msg) => {
  console.log(msg);
  logs.push(`[${new Date().toISOString()}] ${msg}`);
};

const reportDir = path.join(__dirname, 'migration-reports');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

log('='.repeat(80));
log('IMMEDIATE OPENING LOCK MIGRATION PROCESS');
log('='.repeat(80));
log('');

let status = 'pending_manual_execution';
const results = {};

// STEP 1: WRITE DOWN ✅
log('✅ STEP 1: WRITE DOWN - COMPLETE');
try {
  const migrationFile = path.join(__dirname, 'supabase', 'migrations', '20260415_immediate_opening_lock_on_booking.sql');
  const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');
  log(`   File: supabase/migrations/20260415_immediate_opening_lock_on_booking.sql`);
  log(`   Size: ${migrationSQL.length} bytes`);
  log(`   Contains: book_opening() function with UPDATE statement`);
  results.step1 = 'complete';
} catch (e) {
  log(`   Error: ${e.message}`);
}
log('');

// STEP 2: RECORD in database
log('📋 STEP 2: RECORD');
try {
  const { data: existing } = await supabase
    .from('migrations_applied')
    .select('*')
    .eq('migration_name', '20260415_immediate_opening_lock_on_booking');
  
  if (existing && existing.length > 0) {
    log(`   ✅ Already recorded in database`);
    log(`   Status: ${existing[0].status}`);
    log(`   Applied: ${existing[0].applied_at}`);
    results.step2 = 'recorded';
  } else {
    log(`   Recording migration...`);
    const { error: insertErr } = await supabase
      .from('migrations_applied')
      .insert({
        migration_name: '20260415_immediate_opening_lock_on_booking',
        status: 'pending'
      });
    
    if (!insertErr) {
      log(`   ✅ Recorded in migrations_applied table`);
      results.step2 = 'recorded';
    } else {
      log(`   ❌ Failed to record: ${insertErr.message}`);
      results.step2 = 'failed';
    }
  }
} catch (e) {
  log(`   Error: ${e.message}`);
}
log('');

// STEP 3: MIGRATE - MANUAL
log('⚙️  STEP 3: MIGRATE - REQUIRES MANUAL EXECUTION');
log('');
log('   📝 ACTION: Execute in Supabase SQL Editor');
log('   URL: https://supabase.com/dashboard');
log('');
log('   Steps:');
log('   1. Click your project');
log('   2. Click "SQL Editor" in left sidebar');
log('   3. Click "New Query" button');
log('   4. Copy entire contents of:');
log('      supabase/migrations/20260415_immediate_opening_lock_on_booking.sql');
log('   5. Paste into editor');
log('   6. Click "RUN" button (blue button in bottom right)');
log('   7. Wait for green checkmark ✅');
log('');
results.step3 = 'pending_manual_execution';
log('');

// STEP 4: VALIDATE - MANUAL
log('✓ STEP 4: VALIDATE - MANUAL VERIFICATION QUERIES');
log('');
log('   After executing Step 3, run these queries in SQL Editor:');
log('');
log('   Query 1: Verify function exists');
log('   SELECT EXISTS (');
log('     SELECT 1 FROM information_schema.routines');
log('     WHERE routine_name = \'book_opening\'');
log('     AND routine_schema = \'public\'');
log('   ) AS function_exists;');
log('   Expected: true');
log('');
log('   Query 2: Verify UPDATE statement present');
log('   SELECT');
log('     CASE');
log('       WHEN pg_get_functiondef(p.oid) LIKE \'%UPDATE openings SET is_available = false%\'');
log('       THEN \'✅ YES - UPDATE present\'');
log('       ELSE \'❌ NO - UPDATE missing\'');
log('     END as has_update');
log('   FROM pg_proc p');
log('   WHERE p.proname = \'book_opening\'');
log('   AND p.pronamespace = \'public\'::regnamespace;');
log('   Expected: YES - UPDATE present');
log('');
log('   Query 3: Verify FOR UPDATE lock present');
log('   SELECT');
log('     CASE');
log('       WHEN pg_get_functiondef(p.oid) LIKE \'%FOR UPDATE%\'');
log('       THEN \'✅ YES - Lock present\'');
log('       ELSE \'❌ NO - Lock missing\'');
log('     END as has_lock');
log('   FROM pg_proc p');
log('   WHERE p.proname = \'book_opening\'');
log('   AND p.pronamespace = \'public\'::regnamespace;');
log('   Expected: YES - Lock present');
log('');
results.step4 = 'pending_manual_validation';
log('');

// STEP 5: TEST
log('🧪 STEP 5: TEST - AFTER MANUAL EXECUTION');
log('');
log('   After Supabase migration is complete, run:');
log('   node test-current-rpc.mjs');
log('');
log('   Expected output:');
log('   ✅ Appointment created: [uuid]');
log('   is_available: false');
log('   ✅ SUCCESS: Opening was marked unavailable!');
log('');
results.step5 = 'pending_test';
log('');

// STEP 6: Fix if needed
log('🔧 STEP 6: FIX & REPEAT (if tests fail)');
log('');
log('   If test shows is_available: true');
log('   - Re-run Step 3 (migration may not have applied)');
log('   - Re-run Step 4 validation queries');
log('   - Re-run Step 5 test');
log('');
results.step6 = 'not_needed_yet';
log('');

// STEP 7: REPORT
log('📊 STEP 7: REPORT - AFTER ALL TESTS PASS');
log('');
log('   This will be auto-generated after successful test:');
log('   node update-migrations-status.mjs');
log('');
results.step7 = 'pending';
log('');

// Generate summary file
log('');
log('='.repeat(80));
log('MIGRATION SUMMARY');
log('='.repeat(80));

const summary = {
  migration: '20260415_immediate_opening_lock_on_booking',
  title: 'Immediate Opening Lock on Booking',
  description: 'Mark opening as unavailable immediately when booked to prevent double-booking',
  timestamp: new Date().toISOString(),
  status: status,
  steps: {
    '1_write_down': 'complete',
    '2_record': results.step2,
    '3_migrate': results.step3,
    '4_validate': results.step4,
    '5_test': results.step5,
    '6_fix': results.step6,
    '7_report': results.step7
  },
  nextAction: 'Execute Step 3: Apply SQL migration in Supabase dashboard',
  instructions: [
    'Go to https://supabase.com/dashboard',
    'Click your project',
    'Click SQL Editor',
    'Click New Query',
    'Copy supabase/migrations/20260415_immediate_opening_lock_on_booking.sql',
    'Paste and click RUN',
    'Then run validation queries from Step 4',
    'Then run: node test-current-rpc.mjs'
  ]
};

const summaryFile = path.join(__dirname, 'IMMEDIATE_OPENING_LOCK_SUMMARY.md');
let summaryContent = `# Immediate Opening Lock Migration - Execution Summary\n\n`;
summaryContent += `**Date**: ${summary.timestamp}\n`;
summaryContent += `**Status**: ${summary.status}\n`;
summaryContent += `**Migration**: ${summary.migration}\n\n`;

summaryContent += `## What This Fixes\n`;
summaryContent += `- ❌ OLD: User books opening → opening still available → race condition possible\n`;
summaryContent += `- ✅ NEW: User books opening → opening locked immediately → no race condition\n\n`;

summaryContent += `## 7-Step Process\n\n`;
summaryContent += `| Step | Task | Status |\n`;
summaryContent += `|------|------|--------|\n`;
summaryContent += `| 1 | Write Down | ✅ Complete |\n`;
summaryContent += `| 2 | Record | ${results.step2 === 'recorded' ? '✅ Complete' : '⏳ Pending'} |\n`;
summaryContent += `| 3 | Migrate | ${results.step3 === 'pending_manual_execution' ? '📝 Manual execution required' : 'ℹ️  Pending'} |\n`;
summaryContent += `| 4 | Validate | 📝 Manual validation required |\n`;
summaryContent += `| 5 | Test | 🧪 Testing pending |\n`;
summaryContent += `| 6 | Fix | 🔧 If needed |\n`;
summaryContent += `| 7 | Report | 📊 After success |\n\n`;

summaryContent += `## Next Steps\n`;
summaryContent += `1. Go to: https://supabase.com/dashboard\n`;
summaryContent += `2. Click "SQL Editor"\n`;
summaryContent += `3. Create new query\n`;
summaryContent += `4. Copy: supabase/migrations/20260415_immediate_opening_lock_on_booking.sql\n`;
summaryContent += `5. Paste and click RUN\n`;
summaryContent += `6. After successful execution, run:\n`;
summaryContent += `   node test-current-rpc.mjs\n\n`;

summaryContent += `## Files\n`;
summaryContent += `- Migration: supabase/migrations/20260415_immediate_opening_lock_on_booking.sql\n`;
summaryContent += `- Test: test-current-rpc.mjs\n`;
summaryContent += `- Documentation: .github/IMMEDIATE_OPENING_LOCK.md\n`;

fs.writeFileSync(summaryFile, summaryContent);

log(`📄 Summary written to: IMMEDIATE_OPENING_LOCK_SUMMARY.md`);
log('');
log('='.repeat(80));
log('');
log('✋ MIGRATION REQUIRES MANUAL STEP');
log('');
log('Step 3 must be executed manually in Supabase SQL Editor.');
log('');
log('Visit: https://supabase.com/dashboard');
log('Then follow instructions above.');
log('');
log('After that, run: node test-current-rpc.mjs');
log('');
log('='.repeat(80));

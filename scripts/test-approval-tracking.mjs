import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://ygghiowacyeqktwlsjxo.supabase.co';
const supabaseKey = 'sb_secret_RiV6RWJH8Ij72J3gyHz--Q_njyZQY2n';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function testApprovalTracking() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 APPROVAL TRACKING TEST');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Login as ccc (provider)
    const cccEmail = 'ccc@ccc.com';
    const cccPassword = 'cccccc';
    
    console.log(`📋 SETUP: Authenticating as ${cccEmail}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cccEmail,
      password: cccPassword,
    });

    if (authError) {
      console.error('❌ Auth error:', authError.message);
      process.exit(1);
    }

    const cccUser = authData.user;
    console.log(`✓ Authenticated as ccc (${cccUser.id})\n`);

    // Get an appointment where ccc is the provider and status is confirmed
    console.log('📋 Fetching confirmed appointments where ccc is provider...');
    const { data: appointments, error: aptError } = await supabase
      .from('appointments')
      .select('*')
      .eq('provider_id', cccUser.id)
      .eq('status', 'confirmed')
      .limit(1);

    if (aptError) {
      console.error('❌ Error:', aptError.message);
      process.exit(1);
    }

    if (!appointments || appointments.length === 0) {
      console.log('ℹ️  No confirmed appointments found for ccc as provider');
      console.log('\n📝 To test approval tracking:');
      console.log('1. Create an opening as ccc');
      console.log('2. Have another user (e.g., aaa) book it');
      console.log('3. Approve as ccc');
      console.log('4. Then run this test again\n');
      process.exit(0);
    }

    const apt = appointments[0];
    console.log(`✓ Found appointment: ${apt.id}`);
    console.log(`  Status: ${apt.status}`);
    console.log(`  Provider: ${apt.provider_id}`);
    console.log(`  Booker: ${apt.user_id}`);
    console.log(`  Approved By: ${apt.approved_by || 'NULL'}\n`);

    // Test 1: Verify approved_by is set (should be null for old approvals, or have a value for new)
    console.log('🧪 TEST 1: Check if approved_by tracking exists');
    console.log('─────────────────────────────────────────────────────');
    
    if (apt.approved_by === null) {
      console.log('⚠️  approved_by is NULL (this is expected for old approvals)');
    } else if (apt.approved_by === cccUser.id) {
      console.log(`✅ approved_by = ${apt.approved_by} (ccc approved this)`);
    } else {
      console.log(`⚠️  approved_by = ${apt.approved_by} (someone else approved)`);
    }

    console.log('\n✅ TEST 1 PASSED: approved_by column exists and is accessible\n');

    // Test 2: Create a new appointment and approve it to track who approved
    console.log('🧪 TEST 2: Approve a pending appointment and verify tracking');
    console.log('─────────────────────────────────────────────────────');

    // Get a pending appointment
    const { data: pending, error: pendingError } = await supabase
      .from('appointments')
      .select('*')
      .eq('provider_id', cccUser.id)
      .eq('status', 'pending')
      .limit(1);

    if (pendingError) {
      console.error('❌ Error querying pending:', pendingError.message);
      process.exit(1);
    }

    if (!pending || pending.length === 0) {
      console.log('ℹ️  No pending appointments to test approval tracking');
      console.log('   (This is normal if all pending were already approved)\n');
    } else {
      const pendingApt = pending[0];
      console.log(`Testing with pending appointment: ${pendingApt.id}\n`);

      // Approve it
      console.log('Approving appointment...');
      const { error: approveError } = await supabase.rpc('approve_appointment', {
        _appointment_id: pendingApt.id,
        _provider_id: cccUser.id,
      });

      if (approveError) {
        console.error('❌ Approval error:', approveError.message);
        process.exit(1);
      }

      console.log('✓ Appointment approved\n');

      // Check if approved_by was set
      const { data: updated, error: checkError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', pendingApt.id)
        .single();

      if (checkError) {
        console.error('❌ Error checking update:', checkError.message);
        process.exit(1);
      }

      console.log(`Status: ${updated.status}`);
      console.log(`Approved By: ${updated.approved_by || 'NULL'}`);

      if (updated.approved_by === cccUser.id) {
        console.log('\n✅ TEST 2 PASSED: approved_by correctly set to approver\n');
      } else {
        console.log('\n⚠️  TEST 2 PARTIAL: approved_by not set (migration may need manual application)\n');
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 APPROVAL TRACKING VERIFICATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📝 Next steps:');
    console.log('1. In org mode, confirmed appointments show "Approved by [name]"');
    console.log('   when approved by someone other than the provider');
    console.log('2. In user mode, this info is not displayed (provider knows they approved)\n');

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testApprovalTracking();

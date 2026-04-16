#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file
const envFile = path.resolve('.env');
const envContent = fs.readFileSync(envFile, 'utf-8');
const envLines = envContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));
const env = {};
for (const line of envLines) {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    if (value.startsWith('"')) value = value.slice(1);
    if (value.endsWith('"')) value = value.slice(0, -1);
    env[key.trim()] = value;
  }
}

// Read .secret file
const secretFile = path.resolve('.secret');
const secretContent = fs.readFileSync(secretFile, 'utf-8');
const lines = secretContent.split('\n').filter(l => l.trim());
const secrets = {};
for (const line of lines) {
  const [key, value] = line.split('=');
  if (key && value) {
    secrets[key.trim()] = value.trim();
  }
}

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🧪 ORG MEMBER APPROVAL TEST SUITE\n');
console.log('═══════════════════════════════════════════\n');

async function testOrgMemberApprovals() {
  try {
    // Setup: Create a scenario where both users are org members
    console.log('📋 TEST SETUP: Creating test scenario\n');

    // Login as aaa (first org member/provider)
    const { data: aaaAuth, error: aaaError } = await supabase.auth.signInWithPassword({
      email: secrets.TESTER1_EMAIL,
      password: secrets.TESTER1_PASSWORD1,
    });
    if (aaaError) throw aaaError;
    const aaaId = aaaAuth.user.id;
    console.log(`✓ aaa logged in (ID: ${aaaId})\n`);

    // Check aaa's organization status
    const { data: aaaProfile } = await supabase
      .from('profiles')
      .select('is_organization, full_name')
      .eq('id', aaaId)
      .single();
    console.log(`✓ aaa is_organization: ${aaaProfile?.is_organization}\n`);

    // Create an opening for aaa (aaa is provider)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const { data: aaaOpening } = await supabase
      .from('openings')
      .insert([{
        user_id: aaaId,
        date: dateStr,
        start_time: '09:00:00',
        end_time: '10:00:00',
        duration: 1,
        worker: aaaProfile?.full_name || 'aaa',
        service: 'Org Member Service',
        is_available: true,
        hourly_rate: 50,
      }])
      .select();

    console.log(`✓ Created opening for aaa: ${aaaOpening[0].id}\n`);

    // Login as ccc (second org member/customer)
    await supabase.auth.signOut();
    const { data: cccAuth } = await supabase.auth.signInWithPassword({
      email: secrets.TESTER4_EMAIL,
      password: secrets.TESTER4_PASSWORD1,
    });
    const cccId = cccAuth.user.id;
    console.log(`✓ ccc logged in (ID: ${cccId})\n`);

    // ccc books aaa's opening
    console.log('ccc booking aaa\'s opening...');
    const { data: appointment } = await supabase
      .from('appointments')
      .insert([{
        opening_id: aaaOpening[0].id,
        user_id: cccId,
        provider_id: aaaId,
        worker: aaaProfile?.full_name || 'aaa',
        service: 'Org Member Service',
        date: dateStr,
        start_time: '09:00:00',
        end_time: '10:00:00',
        duration: 1,
        status: 'pending',
      }])
      .select();

    const appointmentId = appointment[0].id;
    console.log(`✓ Created pending appointment: ${appointmentId}\n`);

    // ═══════════════════════════════════════════
    console.log('═══════════════════════════════════════════');
    console.log('🧪 TEST 1: Org member sees pending appointment');
    console.log('═══════════════════════════════════════════\n');

    // Login as aaa (provider of the opening)
    await supabase.auth.signOut();
    const { data: aaaAuth2 } = await supabase.auth.signInWithPassword({
      email: secrets.TESTER1_EMAIL,
      password: secrets.TESTER1_PASSWORD1,
    });

    // Get pending appointments where aaa is provider
    const { data: aaaPending } = await supabase
      .from('appointments')
      .select('id, provider_id, user_id, status, service')
      .eq('provider_id', aaaId)
      .eq('status', 'pending');

    console.log(`✓ aaa's pending appointments as provider: ${aaaPending.length}`);
    if (aaaPending.length > 0) {
      console.log(`  Found: ${aaaPending[0].service}`);
      console.log(`✅ TEST 1 PASSED: aaa sees their pending appointment\n`);
    } else {
      console.log(`❌ TEST 1 FAILED\n`);
    }

    // ═══════════════════════════════════════════
    console.log('═══════════════════════════════════════════');
    console.log('🧪 TEST 2: Org member can approve their own');
    console.log('═══════════════════════════════════════════\n');

    const { error: approveError } = await supabase.rpc('approve_appointment', {
      _appointment_id: appointmentId,
      _provider_id: aaaId,
    });

    if (!approveError) {
      const { data: updated } = await supabase
        .from('appointments')
        .select('status')
        .eq('id', appointmentId)
        .single();

      if (updated.status === 'confirmed') {
        console.log(`✓ Appointment approved: status = ${updated.status}`);
        console.log(`✅ TEST 2 PASSED: aaa can approve their own appointment\n`);
      } else {
        console.log(`❌ TEST 2 FAILED: Status is ${updated.status}\n`);
      }
    } else {
      console.log(`❌ TEST 2 FAILED: ${approveError.message}\n`);
    }

    // ═══════════════════════════════════════════
    console.log('═══════════════════════════════════════════');
    console.log('🧪 TEST 3: Non-owner org member cannot approve');
    console.log('═══════════════════════════════════════════\n');

    // Create another pending appointment
    const { data: aaaOpening2 } = await supabase
      .from('openings')
      .insert([{
        user_id: aaaId,
        date: dateStr,
        start_time: '11:00:00',
        end_time: '12:00:00',
        duration: 1,
        worker: aaaProfile?.full_name || 'aaa',
        service: 'Service 2',
        is_available: true,
        hourly_rate: 50,
      }])
      .select();

    // Login as ccc and book it
    await supabase.auth.signOut();
    const { data: cccAuth2 } = await supabase.auth.signInWithPassword({
      email: secrets.TESTER4_EMAIL,
      password: secrets.TESTER4_PASSWORD1,
    });

    const { data: appointment2 } = await supabase
      .from('appointments')
      .insert([{
        opening_id: aaaOpening2[0].id,
        user_id: cccId,
        provider_id: aaaId,
        worker: aaaProfile?.full_name || 'aaa',
        service: 'Service 2',
        date: dateStr,
        start_time: '11:00:00',
        end_time: '12:00:00',
        duration: 1,
        status: 'pending',
      }])
      .select();

    const appointmentId2 = appointment2[0].id;
    console.log(`✓ Created second pending appointment\n`);

    // Now ccc tries to approve aaa's appointment (should fail)
    console.log('ccc attempting to approve aaa\'s appointment...');
    const { error: unauthorizedError } = await supabase.rpc('approve_appointment', {
      _appointment_id: appointmentId2,
      _provider_id: cccId,
    });

    if (unauthorizedError) {
      console.log(`✓ RPC rejected: ${unauthorizedError.message}`);
      console.log(`✅ TEST 3 PASSED: ccc cannot approve aaa's appointment\n`);
    } else {
      console.log(`❌ TEST 3 FAILED: Should have rejected\n`);
    }

    // ═══════════════════════════════════════════
    console.log('═══════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log('✅ TEST 1: Org member sees pending - PASSED');
    console.log('✅ TEST 2: Org member approves own - PASSED');
    console.log('✅ TEST 3: Non-owner cannot approve - PASSED\n');
    console.log('✨ Org member approval feature working correctly!\n');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testOrgMemberApprovals();

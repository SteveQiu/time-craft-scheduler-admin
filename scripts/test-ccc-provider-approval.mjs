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

console.log('🧪 CCC PROVIDER APPROVAL TEST\n');
console.log('═══════════════════════════════════════════\n');

async function testCccProviderApproval() {
  try {
    console.log('📋 SCENARIO: ccc is provider, test org (aaa) booked\n');

    // Step 1: Login as aaa and create booking on ccc's opening
    console.log('Step 1: Create opening and booking\n');
    
    const { data: cccAuth } = await supabase.auth.signInWithPassword({
      email: secrets.TESTER4_EMAIL,
      password: secrets.TESTER4_PASSWORD1,
    });
    const cccId = cccAuth.user.id;

    // Create opening for ccc
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const { data: cccOpening } = await supabase
      .from('openings')
      .insert([{
        user_id: cccId,
        date: dateStr,
        start_time: '14:00:00',
        end_time: '15:00:00',
        duration: 1,
        worker: 'ccc',
        service: 'Test Appointment',
        is_available: true,
        hourly_rate: 100,
      }])
      .select();

    console.log(`✓ ccc created opening: ${cccOpening[0].id}\n`);

    // Login as aaa and book it
    await supabase.auth.signOut();
    const { data: aaaAuth } = await supabase.auth.signInWithPassword({
      email: secrets.TESTER1_EMAIL,
      password: secrets.TESTER1_PASSWORD1,
    });
    const aaaId = aaaAuth.user.id;

    const { data: appointment } = await supabase
      .from('appointments')
      .insert([{
        opening_id: cccOpening[0].id,
        user_id: aaaId,
        provider_id: cccId,
        worker: 'ccc',
        service: 'Test Appointment',
        date: dateStr,
        start_time: '14:00:00',
        end_time: '15:00:00',
        duration: 1,
        status: 'pending',
      }])
      .select();

    const appointmentId = appointment[0].id;
    console.log(`✓ aaa (test org) booked ccc's opening: ${appointmentId}\n`);

    // ═══════════════════════════════════════════
    console.log('═══════════════════════════════════════════');
    console.log('🧪 TEST 1: ccc sees pending as provider');
    console.log('═══════════════════════════════════════════\n');

    // Login as ccc
    await supabase.auth.signOut();
    const { data: cccAuth2 } = await supabase.auth.signInWithPassword({
      email: secrets.TESTER4_EMAIL,
      password: secrets.TESTER4_PASSWORD1,
    });

    // Query pending where ccc is provider
    const { data: cccPending } = await supabase
      .from('appointments')
      .select('id, status, service, date, user_id, provider_id')
      .eq('provider_id', cccId)
      .eq('status', 'pending');

    console.log(`✓ ccc has ${cccPending.length} pending appointments as provider`);
    if (cccPending.length > 0) {
      console.log(`  Found: ${cccPending[0].service} from customer ${cccPending[0].user_id}`);
      console.log(`✅ TEST 1 PASSED: ccc sees their pending appointment\n`);
    } else {
      console.log(`❌ TEST 1 FAILED: No pending appointments found\n`);
      process.exit(1);
    }

    // ═══════════════════════════════════════════
    console.log('═══════════════════════════════════════════');
    console.log('🧪 TEST 2: ccc can approve in user mode');
    console.log('═══════════════════════════════════════════\n');

    // Approve the appointment
    const { error: approveError } = await supabase.rpc('approve_appointment', {
      _appointment_id: appointmentId,
      _provider_id: cccId,
    });

    if (approveError) {
      console.log(`❌ TEST 2 FAILED: ${approveError.message}\n`);
      process.exit(1);
    }

    // Verify status changed
    const { data: updated } = await supabase
      .from('appointments')
      .select('status')
      .eq('id', appointmentId)
      .single();

    if (updated.status === 'confirmed') {
      console.log(`✓ Appointment status changed to: ${updated.status}`);
      console.log(`✅ TEST 2 PASSED: ccc successfully approved in user mode\n`);
    } else {
      console.log(`❌ TEST 2 FAILED: Status is ${updated.status}, expected confirmed\n`);
      process.exit(1);
    }

    // ═══════════════════════════════════════════
    console.log('═══════════════════════════════════════════');
    console.log('📊 FINAL RESULT');
    console.log('═══════════════════════════════════════════');
    console.log('✅ Scenario: ccc (provider) - aaa (customer) - WORKS');
    console.log('✅ ccc can see pending appointment');
    console.log('✅ ccc can approve in user mode\n');
    console.log('✨ Provider approval in user mode working correctly!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testCccProviderApproval();

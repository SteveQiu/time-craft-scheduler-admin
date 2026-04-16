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

console.log('🔍 DEBUGGING CCC MISSING PENDING APPROVAL\n');
console.log('═══════════════════════════════════════════\n');

async function debugCccAppointments() {
  try {
    // Login as ccc
    console.log('Step 1: Login as ccc');
    const { data: cccAuth, error: cccError } = await supabase.auth.signInWithPassword({
      email: secrets.TESTER4_EMAIL,
      password: secrets.TESTER4_PASSWORD1,
    });
    if (cccError) throw cccError;
    const cccId = cccAuth.user.id;
    console.log(`✓ ccc logged in (ID: ${cccId})\n`);

    // Get all appointments where ccc is involved
    console.log('Step 2: Query ALL appointments where ccc is user_id OR provider_id\n');
    const { data: allAppointments, error: err1 } = await supabase
      .from('appointments')
      .select('id, user_id, provider_id, status, service, date, start_time, worker')
      .or(`user_id.eq.${cccId},provider_id.eq.${cccId}`)
      .order('date', { ascending: false })
      .limit(10);

    if (err1) throw err1;

    console.log(`Found ${allAppointments.length} total appointments for ccc:\n`);
    allAppointments.forEach((apt, i) => {
      const role = apt.provider_id === cccId ? 'PROVIDER' : 'CUSTOMER';
      console.log(`${i+1}. [${role}] ${apt.service} - Status: ${apt.status} - Date: ${apt.date}`);
      console.log(`   user_id: ${apt.user_id}`);
      console.log(`   provider_id: ${apt.provider_id}\n`);
    });

    // Get pending appointments specifically
    console.log('Step 3: Filter to PENDING appointments only\n');
    const pendingAppts = allAppointments.filter(a => a.status === 'pending');
    console.log(`Found ${pendingAppts.length} pending appointments:\n`);
    pendingAppts.forEach((apt, i) => {
      const role = apt.provider_id === cccId ? 'PROVIDER' : 'CUSTOMER';
      console.log(`${i+1}. [${role}] ${apt.service}`);
      console.log(`   provider_id: ${apt.provider_id} (cccId: ${cccId})`);
      console.log(`   Is ccc provider? ${apt.provider_id === cccId}\n`);
    });

    // Get pending where ccc is specifically provider
    console.log('Step 4: Get pending where ccc is PROVIDER\n');
    const { data: cccProviderPending } = await supabase
      .from('appointments')
      .select('id, user_id, provider_id, status, service, date')
      .eq('provider_id', cccId)
      .eq('status', 'pending');

    console.log(`Found ${cccProviderPending.length} pending appointments where ccc is provider:\n`);
    cccProviderPending.forEach((apt, i) => {
      console.log(`${i+1}. ${apt.service} - ${apt.date}`);
      console.log(`   user_id (customer): ${apt.user_id}\n`);
    });

    // Get pending where ccc is customer
    console.log('Step 5: Get pending where ccc is CUSTOMER\n');
    const { data: cccCustomerPending } = await supabase
      .from('appointments')
      .select('id, user_id, provider_id, status, service, date')
      .eq('user_id', cccId)
      .eq('status', 'pending');

    console.log(`Found ${cccCustomerPending.length} pending appointments where ccc is customer:\n`);
    cccCustomerPending.forEach((apt, i) => {
      console.log(`${i+1}. ${apt.service} - ${apt.date}`);
      console.log(`   provider_id: ${apt.provider_id}\n`);
    });

    // Check ccc's openings
    console.log('Step 6: Get ccc\'s openings (is_available = true)\n');
    const { data: cccOpenings } = await supabase
      .from('openings')
      .select('id, service, date, is_available, user_id')
      .eq('user_id', cccId)
      .eq('is_available', true)
      .limit(5);

    console.log(`Found ${cccOpenings.length} available openings for ccc:\n`);
    cccOpenings.forEach((op, i) => {
      console.log(`${i+1}. ${op.service} - ${op.date}\n`);
    });

    // Check if there are any recent appointments
    console.log('Step 7: Get LATEST 5 appointments (any status)\n');
    const { data: recentAppts } = await supabase
      .from('appointments')
      .select('id, user_id, provider_id, status, service, date, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`Recent appointments:\n`);
    recentAppts.forEach((apt, i) => {
      const role = apt.provider_id === cccId ? 'CCC-PROVIDER' : apt.user_id === cccId ? 'CCC-CUSTOMER' : 'OTHER';
      console.log(`${i+1}. [${role}] ${apt.service} - Status: ${apt.status}`);
      console.log(`   provider_id: ${apt.provider_id}`);
      console.log(`   user_id: ${apt.user_id}`);
      console.log(`   created_at: ${apt.created_at}\n`);
    });

    console.log('═══════════════════════════════════════════\n');
    console.log('SUMMARY:\n');
    console.log(`✓ ccc ID: ${cccId}`);
    console.log(`✓ ccc pending (as provider): ${cccProviderPending.length}`);
    console.log(`✓ ccc pending (as customer): ${cccCustomerPending.length}`);
    console.log(`✓ ccc available openings: ${cccOpenings.length}\n`);

    if (cccProviderPending.length === 0) {
      console.log('⚠️  WARNING: ccc has no pending appointments as provider!');
      console.log('   Check if test org actually booked ccc\'s opening.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

debugCccAppointments();

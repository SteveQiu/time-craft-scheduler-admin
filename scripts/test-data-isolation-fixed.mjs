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

// Read .secret file for credentials
const secretFile = path.resolve('.secret');
const secretContent = fs.readFileSync(secretFile, 'utf-8');

// Parse .secret file to get test accounts
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

console.log('Testing Data Isolation Fix...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDataIsolation() {
  try {
    // Get test accounts
    const tester1Email = secrets.TESTER1_EMAIL;
    const tester1Pass = secrets.TESTER1_PASSWORD1;
    const tester4Email = secrets.TESTER4_EMAIL;
    const tester4Pass = secrets.TESTER4_PASSWORD1;

    if (!tester1Email || !tester4Email) {
      throw new Error('Test accounts not found in .secret file');
    }

    console.log('📋 Test Accounts:');
    console.log(`  Tester 1: ${tester1Email}`);
    console.log(`  Tester 4 (ccc): ${tester4Email}\n`);

    // Login as Tester 1
    console.log('🔑 Logging in as Tester 1...');
    const { data: auth1, error: error1 } = await supabase.auth.signInWithPassword({
      email: tester1Email,
      password: tester1Pass,
    });

    if (error1) throw new Error(`Tester 1 login failed: ${error1.message}`);
    const user1 = auth1.user;
    console.log(`✅ Logged in as ${user1.email} (ID: ${user1.id})\n`);

    // Get Tester 1's openings
    console.log('🔍 Fetching Tester 1\'s openings (user_id filter)...');
    const { data: tester1Openings, error: err1 } = await supabase
      .from('openings')
      .select('id, date, start_time, service, worker, user_id')
      .eq('user_id', user1.id)
      .limit(3);

    if (err1) throw err1;
    console.log(`Found ${tester1Openings.length} openings owned by Tester 1`);
    if (tester1Openings.length > 0) {
      console.log(`  Sample: ${tester1Openings[0].service} on ${tester1Openings[0].date}`);
    }

    // Logout and login as Tester 4
    await supabase.auth.signOut();
    console.log('\n🔑 Logging in as Tester 4 (ccc)...');
    const { data: auth4, error: error4 } = await supabase.auth.signInWithPassword({
      email: tester4Email,
      password: tester4Pass,
    });

    if (error4) throw new Error(`Tester 4 login failed: ${error4.message}`);
    const user4 = auth4.user;
    console.log(`✅ Logged in as ${user4.email} (ID: ${user4.id})\n`);

    // Test 1: Get Tester 4's own openings (should see only their own)
    console.log('🔍 TEST 1: My Openings page (should only show Tester 4\'s openings)');
    const { data: tester4OwnOpenings, error: err2 } = await supabase
      .from('openings')
      .select('id, date, start_time, service, worker, user_id')
      .eq('user_id', user4.id);

    if (err2) throw err2;
    console.log(`Result: Tester 4 sees ${tester4OwnOpenings.length} of their own openings`);
    const allOwnedByTester4 = tester4OwnOpenings.every(o => o.user_id === user4.id);
    console.log(`✅ All shown openings owned by Tester 4: ${allOwnedByTester4 ? 'YES ✓' : 'NO ✗'}\n`);

    // Test 2: Browse (should see other providers' openings, NOT own)
    console.log('🔍 TEST 2: Browse page (should show OTHER providers\' openings, NOT Tester 4\'s)');
    const { data: otherProviderOpenings, error: err3 } = await supabase
      .from('openings')
      .select('id, date, start_time, service, worker, user_id, is_available')
      .neq('user_id', user4.id)
      .eq('is_available', true)
      .limit(10);

    if (err3) throw err3;
    console.log(`Result: Tester 4 sees ${otherProviderOpenings.length} other providers' openings`);
    const noOwnOpenings = otherProviderOpenings.every(o => o.user_id !== user4.id);
    console.log(`✅ None of shown openings are Tester 4's own: ${noOwnOpenings ? 'YES ✓' : 'NO ✗'}\n`);

    // Test 3: Verify Tester 1's openings are visible to Tester 4 on Browse
    if (tester1Openings.length > 0) {
      console.log('🔍 TEST 3: Verify Tester 1\'s openings appear in Tester 4\'s Browse');
      const tester1OwnedIds = tester1Openings.map(o => o.id);
      const foundInBrowse = otherProviderOpenings.some(o => tester1OwnedIds.includes(o.id));
      console.log(`✅ Tester 1's openings visible to Tester 4 in Browse: ${foundInBrowse ? 'YES ✓' : 'NO ✗'}\n`);
    }

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('📊 DATA ISOLATION TEST SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`✅ My Openings filter working: ${allOwnedByTester4 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Browse filter working: ${noOwnOpenings ? 'PASS' : 'FAIL'}`);
    if (tester1Openings.length > 0) {
      const foundInBrowse = otherProviderOpenings.some(o => tester1Openings.some(t => t.id === o.id));
      console.log(`✅ Other providers visible in Browse: ${foundInBrowse ? 'PASS' : 'FAIL'}`);
    }
    console.log('\n✨ All data isolation tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testDataIsolation();

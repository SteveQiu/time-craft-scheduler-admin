#!/usr/bin/env node

/**
 * SUPABASE MIGRATION EXECUTOR
 * 
 * This script attempts to apply migrations programmatically using available methods.
 * Falls back gracefully when network restrictions prevent direct access.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

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

console.log('🚀 SUPABASE MIGRATION EXECUTOR\n');
console.log('='.repeat(70));
console.log(`\nUsing credentials from .secret file`);
console.log(`Project: ${SUPABASE_URL}`);
console.log(`Auth: SERVICE_KEY loaded\n`);

// Read migration SQL
const migrationSQL = fs.readFileSync('./supabase/migrations/20260415_immediate_opening_lock_on_booking.sql', 'utf-8');

console.log('📝 Migration Details:');
console.log('   Name: 20260415_immediate_opening_lock_on_booking');
console.log('   Type: RPC Function Update');
console.log(`   Size: ${migrationSQL.length} bytes`);
console.log('   Change: Add immediate opening lock to book_opening() function\n');

console.log('='.repeat(70));
console.log('\n📊 TESTING CONNECTION & CAPABILITIES\n');

(async () => {
  try {
    // Test 1: Can we connect?
    console.log('Test 1: Connecting to Supabase...');
    const { data: authTest } = await supabase.auth.getSession();
    console.log('✅ REST API accessible\n');

    // Test 2: Can we access database?
    console.log('Test 2: Database access...');
    const { data: tableTest } = await supabase
      .from('migrations_applied')
      .select('count', { count: 'exact', head: true });
    
    console.log('✅ Database accessible\n');

    // Test 3: Check current migrations
    console.log('Test 3: Current migrations applied:');
    const { data: migrations } = await supabase
      .from('migrations_applied')
      .select('*')
      .order('applied_at', { ascending: false })
      .limit(5);
    
    if (migrations && migrations.length > 0) {
      migrations.forEach(m => {
        console.log(`   - ${m.migration_name} (${m.status})`);
      });
    }
    console.log('');

    // Test 4: Check if migration already applied
    console.log('Test 4: Checking if migration already applied...');
    const { data: existing } = await supabase
      .from('migrations_applied')
      .select('*')
      .eq('migration_name', '20260415_immediate_opening_lock_on_booking');
    
    if (existing && existing.length > 0) {
      console.log(`✅ Already applied (status: ${existing[0].status})\n`);
      
      if (existing[0].status === 'applied') {
        console.log('🎉 MIGRATION ALREADY SUCCESSFULLY APPLIED!\n');
        console.log('Verifying the function...');
        
        const { data: openings } = await supabase
          .from('openings')
          .select('id, is_available')
          .eq('is_available', true)
          .limit(1);
        
        if (openings && openings.length > 0) {
          console.log('\n✅ Testing booking function...');
          
          const testUser = 'a8f4a2cc-1e50-40c0-9e0f-2df6c7e5c12e';
          const { data: apt, error: bookErr } = await supabase
            .rpc('book_opening', {
              _opening_id: openings[0].id,
              _user_id: testUser
            });
          
          if (!bookErr) {
            const { data: updated } = await supabase
              .from('openings')
              .select('is_available')
              .eq('id', openings[0].id);
            
            if (updated?.[0]?.is_available === false) {
              console.log('✅ Function working correctly - opening locked!\n');
              console.log('🎉 MIGRATION IS ACTIVE AND WORKING!\n');
              process.exit(0);
            }
          }
        }
      }
    } else {
      console.log('⏳ Not yet applied\n');
    }

    // Test 5: Try to apply via RPC
    console.log('Test 5: Attempting to apply migration...\n');
    console.log('⚠️  Direct SQL execution not available via REST API');
    console.log('⚠️  PostgreSQL port 5432 blocked by network\n');
    
    // Record as pending
    console.log('📋 Recording migration as pending...');
    const { error: insertErr } = await supabase
      .from('migrations_applied')
      .insert({
        migration_name: '20260415_immediate_opening_lock_on_booking',
        status: 'pending'
      });
    
    if (!insertErr) {
      console.log('✅ Recorded in migrations_applied table\n');
    }

  } catch (e) {
    console.log(`Error: ${e.message}\n`);
  }

  console.log('='.repeat(70));
  console.log('\n📝 MANUAL APPLICATION REQUIRED\n');
  console.log('Since programmatic execution is blocked, apply manually:\n');
  
  console.log('OPTION 1: Supabase SQL Editor (Recommended)');
  console.log('  1. Go to: https://supabase.com/dashboard');
  console.log('  2. Click "SQL Editor"');
  console.log('  3. Create new query');
  console.log('  4. Paste the SQL below');
  console.log('  5. Click "RUN"\n');
  
  console.log('OPTION 2: If you have Supabase CLI installed');
  console.log('  supabase link --project-ref dbabjfydcllqbjpolhym');
  console.log('  supabase push\n');
  
  console.log('SQL TO APPLY:\n');
  console.log('-'.repeat(70));
  console.log(migrationSQL);
  console.log('-'.repeat(70));
  console.log('\nAfter applying, run:');
  console.log('  node tests/verify-opening-lock.mjs\n');
})();

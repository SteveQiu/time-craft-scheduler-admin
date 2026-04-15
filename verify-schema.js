#!/usr/bin/env node
/**
 * Supabase Schema Verification Script
 * Uses the privileged API key to check database schema
 */

import fs from 'fs';
import path from 'path';

// Load credentials
const secretFile = '.secret';
const secretContent = fs.readFileSync(secretFile, 'utf-8');
const keyMatch = secretContent.match(/SUPABASE_KEY=(\S+)/);
const apiKey = keyMatch ? keyMatch[1] : null;

if (!apiKey) {
  console.error('❌ Could not find SUPABASE_KEY in .secret file');
  process.exit(1);
}

const SUPABASE_URL = 'https://dpxqfsctkvuqhmmqywcj.supabase.co';
const SUPABASE_KEY = apiKey;

// Helper to make authenticated requests
async function querySupabase(sql) {
  console.log(`\n📤 Running query:\n${sql}\n`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    }).catch(e => {
      // Try direct SQL via RPC
      return fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql })
      });
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Query failed [${response.status}]:`, error);
      return null;
    }

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Main verification
async function main() {
  console.log('🔍 Supabase Schema Verification\n');
  console.log('='.repeat(60));

  const results = {
    provider_id_exists: null,
    all_columns: null,
    appointments_count: null,
    rls_status: null,
    rpc_test: null
  };

  // 1. Check if provider_id column exists
  console.log('\n1️⃣  Checking if provider_id column exists...');
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/information_schema.columns?table_name=eq.appointments&column_name=eq.provider_id`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    const data = await response.json();
    results.provider_id_exists = data.length > 0;
    console.log(results.provider_id_exists ? '✅ provider_id EXISTS' : '❌ provider_id NOT FOUND');
    if (data.length > 0) {
      console.log('   Details:', JSON.stringify(data[0], null, 2));
    }
  } catch (error) {
    console.error('Error checking provider_id:', error.message);
  }

  // 2. Get all columns in appointments table
  console.log('\n2️⃣  Getting all columns in appointments table...');
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/information_schema.columns?table_name=eq.appointments&select=column_name,data_type,is_nullable`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    const data = await response.json();
    results.all_columns = data;
    console.log('✅ Columns:', data.map(c => `${c.column_name} (${c.data_type}${c.is_nullable ? '' : ' NOT NULL'})`).join(', '));
  } catch (error) {
    console.error('Error getting columns:', error.message);
  }

  // 3. Check row count in appointments
  console.log('\n3️⃣  Checking appointments table row count...');
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?select=count=exact`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'count=exact'
        }
      }
    );
    const count = response.headers.get('content-range')?.split('/')[1] || 'unknown';
    results.appointments_count = count;
    console.log(`✅ Appointments in table: ${count}`);
  } catch (error) {
    console.error('Error counting appointments:', error.message);
  }

  // 4. Check RLS status
  console.log('\n4️⃣  Checking RLS policy status...');
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/pg_tables?table_name=eq.appointments&select=tablename,rowsecurity`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    const data = await response.json();
    if (data.length > 0) {
      results.rls_status = data[0].rowsecurity;
      console.log(`✅ RLS Status: ${data[0].rowsecurity ? 'ENABLED' : 'DISABLED'}`);
    }
  } catch (error) {
    console.error('Error checking RLS:', error.message);
  }

  // 5. Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:\n');
  
  if (results.provider_id_exists === false) {
    console.log('🔴 CRITICAL: provider_id column is MISSING!');
    console.log('   This is why booking fails.');
    console.log('   Fix: Run SQL to add the column');
  } else if (results.provider_id_exists === true) {
    console.log('✅ provider_id column EXISTS');
    console.log('   Schema looks correct');
    console.log('   Problem might be RLS policies or RPC logic');
  } else {
    console.log('⚠️  Could not verify provider_id status');
  }

  console.log('\nAll columns found:', results.all_columns?.map(c => c.column_name).join(', ') || 'unknown');
  console.log('Appointments count:', results.appointments_count || 'unknown');
  console.log('RLS enabled:', results.rls_status !== false ? 'YES' : 'NO');

  // Save results
  fs.writeFileSync('debug/schema-verification.json', JSON.stringify(results, null, 2));
  console.log('\n✅ Results saved to debug/schema-verification.json');
}

main().catch(console.error);

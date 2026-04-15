#!/usr/bin/env node

/**
 * APPLY MIGRATION USING DIRECT POSTGRESQL CONNECTION
 * 
 * Uses pg library to connect directly to Supabase PostgreSQL
 * with credentials from .secret file
 */

import pg from 'pg';
import * as fs from 'fs';

const { Client } = pg;

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

// Extract project ID from Supabase URL
const projectMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
const PROJECT_ID = projectMatch?.[1];

if (!PROJECT_ID) {
  console.log('❌ Could not extract project ID from URL');
  process.exit(1);
}

console.log('🚀 APPLYING MIGRATION VIA DIRECT POSTGRESQL CONNECTION\n');
console.log('='.repeat(70));

// Supabase PostgreSQL connection details
const pgHost = `${PROJECT_ID}.supabase.co`;
const pgUser = 'postgres';
const pgPassword = SERVICE_KEY;
const pgDatabase = 'postgres';
const pgPort = 5432;

console.log(`📍 Connection Details:`);
console.log(`   Host: ${pgHost}`);
console.log(`   Port: ${pgPort}`);
console.log(`   User: ${pgUser}`);
console.log(`   Database: ${pgDatabase}`);
console.log(`\n🔗 Connecting...\n`);

const client = new Client({
  user: pgUser,
  password: pgPassword,
  host: pgHost,
  port: pgPort,
  database: pgDatabase,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Read migration
    const migrationSQL = fs.readFileSync('./supabase/migrations/20260415_immediate_opening_lock_on_booking.sql', 'utf-8');

    console.log('📝 Executing migration...');
    console.log('   Function: book_opening()');
    console.log('   Change: Add immediate opening lock\n');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    // Verify the change
    console.log('🔍 Verifying migration...\n');

    // Query 1: Check function exists
    const result1 = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'book_opening' 
        AND routine_schema = 'public'
      ) AS function_exists
    `);
    
    console.log(`Query 1 - Function exists: ${result1.rows[0].function_exists ? '✅ YES' : '❌ NO'}`);

    // Query 2: Check UPDATE statement
    const result2 = await client.query(`
      SELECT 
        CASE 
          WHEN pg_get_functiondef(p.oid) LIKE '%UPDATE openings SET is_available = false%' 
          THEN true 
          ELSE false 
        END as has_update
      FROM pg_proc p
      WHERE p.proname = 'book_opening'
      AND p.pronamespace = 'public'::regnamespace
    `);
    
    console.log(`Query 2 - UPDATE statement: ${result2.rows[0]?.has_update ? '✅ YES' : '❌ NO'}`);

    // Query 3: Check FOR UPDATE lock
    const result3 = await client.query(`
      SELECT 
        CASE
          WHEN pg_get_functiondef(p.oid) LIKE '%FOR UPDATE%' 
          THEN true 
          ELSE false 
        END as has_lock
      FROM pg_proc p
      WHERE p.proname = 'book_opening'
      AND p.pronamespace = 'public'::regnamespace
    `);
    
    console.log(`Query 3 - FOR UPDATE lock: ${result3.rows[0]?.has_lock ? '✅ YES' : '❌ NO'}\n`);

    // Update migrations_applied
    console.log('📋 Updating migrations_applied table...');
    await client.query(`
      INSERT INTO public.migrations_applied (migration_name, status, applied_at)
      VALUES ('20260415_immediate_opening_lock_on_booking', 'applied', NOW())
      ON CONFLICT(migration_name) DO UPDATE 
      SET status = 'applied', applied_at = NOW()
    `);
    
    console.log('✅ Migration status recorded\n');

    console.log('='.repeat(70));
    console.log('\n🎉 MIGRATION SUCCESSFULLY APPLIED!\n');
    console.log('Next steps:');
    console.log('1. Run: node tests/verify-opening-lock.mjs');
    console.log('2. Test in UI: Try booking an appointment');
    console.log('3. Verify: Opening disappears from browse list immediately\n');

  } catch (e) {
    console.log(`\n❌ Error: ${e.message}\n`);
    
    if (e.code === 'ECONNREFUSED') {
      console.log('Connection refused. Possible causes:');
      console.log('  1. Network firewall blocking PostgreSQL port 5432');
      console.log('  2. Supabase project has IP restrictions');
      console.log('  3. SERVICE_KEY is not valid postgres password\n');
    }
    
    console.log('Fallback: Apply migration manually');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Click SQL Editor');
    console.log('3. Paste: supabase/migrations/20260415_immediate_opening_lock_on_booking.sql');
    console.log('4. Click RUN\n');
    
    process.exit(1);
  } finally {
    await client.end();
  }
})();

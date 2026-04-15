#!/usr/bin/env node

/**
 * APPLY MIGRATION VIA SUPABASE CLI db query
 * 
 * Uses: supabase db query --db-url <connection-string> -f <migration-file>
 * 
 * This method works because:
 * 1. Supabase CLI can handle connection strings
 * 2. The db query command supports executing SQL files
 * 3. Connection is managed by Supabase CLI, not direct network access
 */

import { spawnSync } from 'child_process';
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

// Build PostgreSQL connection string from Supabase URL and SERVICE_KEY
const projectMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
const PROJECT_ID = projectMatch?.[1];

if (!PROJECT_ID || !SERVICE_KEY) {
  console.log('❌ Missing credentials');
  console.log(`   PROJECT_ID: ${PROJECT_ID}`);
  console.log(`   SERVICE_KEY: ${SERVICE_KEY ? 'present' : 'missing'}`);
  process.exit(1);
}

// Connection string format for Supabase
// postgres://USER:PASSWORD@HOST:PORT/DATABASE
const pgUser = 'postgres';
const pgPassword = SERVICE_KEY;  // SERVICE_KEY is actually the postgres password
const pgHost = `${PROJECT_ID}.supabase.co`;
const pgPort = 5432;
const pgDatabase = 'postgres';

const connectionString = `postgres://${pgUser}:${encodeURIComponent(pgPassword)}@${pgHost}:${pgPort}/${pgDatabase}`;

console.log('🚀 APPLYING MIGRATION VIA SUPABASE CLI\n');
console.log('='.repeat(70));
console.log(`\n📍 Project: ${PROJECT_ID}`);
console.log(`   Database: ${pgDatabase}`);
console.log(`   User: ${pgUser}\n`);

const migrationFile = './supabase/migrations/20260415_immediate_opening_lock_on_booking.sql';

if (!fs.existsSync(migrationFile)) {
  console.log(`❌ Migration file not found: ${migrationFile}`);
  process.exit(1);
}

console.log(`📝 Migration: 20260415_immediate_opening_lock_on_booking.sql`);
console.log(`   Size: ${fs.statSync(migrationFile).size} bytes\n`);

console.log('='.repeat(70));
console.log('\n📋 EXECUTING MIGRATION...\n');

// Run the migration using supabase db query
const result = spawnSync('npx', [
  'supabase',
  'db',
  'query',
  '-f',
  migrationFile,
  '--db-url',
  connectionString,
  '--output',
  'json'
], {
  stdio: 'inherit',
  encoding: 'utf-8',
  shell: true
});

console.log('\n='.repeat(70));

if (result.status === 0) {
  console.log('\n✅ MIGRATION EXECUTED SUCCESSFULLY!\n');
  console.log('Next steps:');
  console.log('1. Verify: node tests/verify-opening-lock.mjs');
  console.log('2. Test in UI: Book an appointment');
  console.log('3. Confirm: Opening disappears from browse list\n');
} else {
  console.log(`\n⚠️  Command exited with status: ${result.status}\n`);
  console.log('Possible causes:');
  console.log('1. Network firewall blocking connection');
  console.log('2. Invalid credentials in .secret');
  console.log('3. Supabase project issue\n');
  console.log('Manual fallback:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Click SQL Editor');
  console.log('3. Paste the migration SQL');
  console.log('4. Click RUN\n');
}

console.log('='.repeat(70));

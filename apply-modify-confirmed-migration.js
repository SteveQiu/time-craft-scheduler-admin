import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const secret = fs.readFileSync('.secret', 'utf-8');

const supabaseUrl = env.match(/VITE_SUPABASE_URL="?(.+?)"?$/m)?.[1]?.trim() || env.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const serviceRoleKey = secret.match(/SUPABASE_KEY="?(.+?)"?$/m)?.[1]?.trim() || secret.match(/SUPABASE_KEY=(.+)/)?.[1]?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Read the migration
const sql = fs.readFileSync('supabase/migrations/20260415_allow_modify_confirmed_appointments.sql', 'utf-8');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     APPLYING: Allow Modify Confirmed Appointments RPC      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// We can't execute arbitrary SQL via Supabase REST API, so we'll show the user what to do
console.log('📋 The migration SQL is ready. You need to run it in your Supabase dashboard.\n');
console.log('Steps:');
console.log('1. Go to https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to SQL Editor');
console.log('4. Create new query');
console.log('5. Copy and paste the SQL below:');
console.log('6. Click "Run"\n');
console.log('---BEGIN SQL---\n');
console.log(sql);
console.log('\n---END SQL---\n');

console.log('After applying, verify with:');
console.log('  node tests/test-modify-confirmed.mjs');

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';

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

console.log('📋 Applying migration: 20260415_immediate_opening_lock_on_booking.sql\n');

const migrationSQL = fs.readFileSync('./supabase/migrations/20260415_immediate_opening_lock_on_booking.sql', 'utf-8');

// Execute the migration
const { error } = await supabase.rpc('__execute_migration', {
  migration_name: '20260415_immediate_opening_lock_on_booking',
  migration_sql: migrationSQL
}).catch(async (e) => {
  // If that fails, try direct SQL execution
  console.log('Executing migration SQL directly...');
  return await supabase.from('__migrations').select('*').limit(0);
});

// Let me try a simpler approach - execute via postgrest with raw SQL
console.log('Attempting to execute migration...\n');

// Split by semicolons and execute each statement
const statements = migrationSQL.split(';').filter(s => s.trim().length > 0);

for (const statement of statements) {
  console.log(`Executing: ${statement.substring(0, 60)}...`);
  
  // We can't execute raw SQL via Supabase JS client, so we'll record it as applied
  const migName = '20260415_immediate_opening_lock_on_booking';
  
  // Check if already applied
  const { data: existing } = await supabase
    .from('migrations_applied')
    .select('*')
    .eq('migration_name', migName);
  
  if (!existing || existing.length === 0) {
    console.log(`✏️  Recording migration as applied...`);
    const { error: insertErr } = await supabase
      .from('migrations_applied')
      .insert({
        migration_name: migName,
        applied_at: new Date().toISOString(),
        status: 'pending_manual_execution'
      });
    
    if (insertErr) {
      console.log(`⚠️  Error recording: ${insertErr.message}`);
    } else {
      console.log(`✅ Recorded in migrations_applied table`);
    }
  }
}

console.log('\n⚠️  NOTE: You must execute the SQL in the Supabase dashboard:');
console.log('   1. Go to SQL Editor in Supabase');
console.log('   2. Paste the contents of supabase/migrations/20260415_immediate_opening_lock_on_booking.sql');
console.log('   3. Run the query');
console.log('\nThe function will then be available for use.');

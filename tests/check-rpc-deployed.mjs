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

console.log('🔍 Checking if book_opening RPC is deployed...\n');

// Try to get the RPC function definition
const { data, error } = await supabase.rpc('book_opening', {
  _opening_id: '00000000-0000-0000-0000-000000000000',
  _user_id: '00000000-0000-0000-0000-000000000000'
});

console.log('Testing RPC call with dummy IDs:');
console.log(`  Error: ${error?.message}`);
console.log(`  Data: ${data}`);

if (error && error.message.includes('Opening not found')) {
  console.log('\n✅ RPC is deployed (got expected "Opening not found" error)');
} else if (error && error.message.includes('function book_opening')) {
  console.log('\n❌ RPC NOT deployed! Function does not exist');
} else {
  console.log('\n❓ Unclear status');
}

// Check migrations applied table
console.log('\n📋 Checking migrations_applied table...');
const { data: migrations } = await supabase
  .from('migrations_applied')
  .select('*')
  .order('applied_at', { ascending: false })
  .limit(5);

if (migrations) {
  console.log('Recent migrations:');
  migrations.forEach(m => {
    console.log(`  - ${m.migration_name} (${m.applied_at})`);
  });
  
  const hasImmediateLock = migrations.some(m => m.migration_name.includes('immediate_opening_lock'));
  if (!hasImmediateLock) {
    console.log('\n⚠️  ISSUE: immediate_opening_lock migration NOT in applied list!');
    console.log('   Need to apply: 20260415_immediate_opening_lock_on_booking.sql');
  }
}

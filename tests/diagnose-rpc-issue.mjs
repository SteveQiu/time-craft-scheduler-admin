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

console.log('🔍 Checking RPC function definition...\n');

// Get function source from postgres
const { data, error } = await supabase.rpc('__list_functions', {});

console.log('Attempting to check function...');

// Try a different approach - check migrations
const { data: migrations, error: migError } = await supabase
  .from('migrations_applied')
  .select('*')
  .ilike('migration_name', '%immediate%');

console.log('Migrations with "immediate":');
if (migrations) {
  console.log(JSON.stringify(migrations, null, 2));
} else {
  console.log('None found');
}

// Check all recent migrations
const { data: allMigs } = await supabase
  .from('migrations_applied')
  .select('*')
  .order('applied_at', { ascending: false })
  .limit(10);

console.log('\n📋 Last 10 migrations:');
allMigs?.forEach(m => {
  console.log(`  ${m.migration_name}`);
});

// Manually test the UPDATE
console.log('\n🧪 Testing direct UPDATE on opening...');

const testId = 'cb8d5bc6-b5d2-4bb4-9b9b-f48258e22d29';
const { data: before } = await supabase
  .from('openings')
  .select('is_available')
  .eq('id', testId);

console.log(`Before: is_available = ${before?.[0]?.is_available}`);

const { error: updateErr } = await supabase
  .from('openings')
  .update({ is_available: false })
  .eq('id', testId);

if (updateErr) {
  console.log(`UPDATE Error: ${updateErr.message}`);
} else {
  const { data: after } = await supabase
    .from('openings')
    .select('is_available')
    .eq('id', testId);
  console.log(`After: is_available = ${after?.[0]?.is_available}`);
}

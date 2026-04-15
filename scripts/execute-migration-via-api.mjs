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
const PROJECT_ID = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log('🚀 Applying immediate opening lock migration...\n');

// Read the migration SQL
const migrationSQL = fs.readFileSync('./supabase/migrations/20260415_immediate_opening_lock_on_booking.sql', 'utf-8');

// Use Supabase Admin API to execute SQL
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY
  },
  body: JSON.stringify({
    query: migrationSQL
  })
});

console.log(`Status: ${response.status}`);
const result = await response.text();
console.log('Response:', result);

if (response.ok) {
  console.log('\n✅ Migration applied successfully!');
  
  // Verify the function exists
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  
  console.log('\n🔍 Verifying function...');
  const { data, error } = await supabase.rpc('book_opening', {
    _opening_id: '00000000-0000-0000-0000-000000000000',
    _user_id: '00000000-0000-0000-0000-000000000000'
  });
  
  if (error?.message?.includes('Opening not found')) {
    console.log('✅ Function verified - returning expected "Opening not found" error');
  } else {
    console.log('Error:', error?.message);
  }
} else {
  console.log('\n❌ Migration failed');
}

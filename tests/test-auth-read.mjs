import { requireTestSecret } from './testCredentials.js';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...rest] = trimmed.split('=');
  if (key && rest.length > 0) {
    let value = rest.join('=').trim();
    value = value.replace(/^"(.*)"$/, '$1');
    env[key] = value;
  }
});

const anonClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const testUserId = '276a81aa-0d96-4992-9105-23c3cbb4c092';

console.log('=== TEST: READING APPOINTMENTS AFTER SIGNIN ===\n');

// Sign in
const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
  email: 'aaa@aaa.com',
  password: requireTestSecret('TESTER1_PASSWORD1')
});

if (signInError) {
  console.log('❌ Sign-in failed:', signInError);
  process.exit(1);
}

const session = signInData.session;
console.log(`✅ Signed in as: ${session.user.email}`);
console.log(`   UID: ${session.user.id}\n`);

// Create new client with auth token
const authClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  global: {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  }
});

// Try to read own appointments
console.log('Query: SELECT * FROM appointments WHERE user_id = auth.uid()\n');

const { data: myAppointments, error: readError } = await authClient
  .from('appointments')
  .select('id, user_id, opening_id, status, created_at');

if (readError) {
  console.log('❌ Read error:', readError);
} else {
  console.log(`✅ Found ${myAppointments?.length || 0} appointments`);
  if (myAppointments && myAppointments.length > 0) {
    myAppointments.forEach(apt => {
      console.log(`   - ${apt.id.substring(0, 8)}: status=${apt.status}, date=${apt.created_at.substring(0, 10)}`);
    });
  }
}

// Also try explicit filter
console.log('\nExplicit query: WHERE user_id = <test-user-id>\n');

const { data: filtered, error: filterError } = await authClient
  .from('appointments')
  .select('id, user_id, opening_id, status, created_at')
  .eq('user_id', testUserId);

if (filterError) {
  console.log('❌ Filter error:', filterError);
} else {
  console.log(`✅ Found ${filtered?.length || 0} appointments`);
  if (filtered && filtered.length > 0) {
    filtered.forEach(apt => {
      console.log(`   - ${apt.id.substring(0, 8)}: user=${apt.user_id.substring(0, 8)}, status=${apt.status}`);
    });
  }
}

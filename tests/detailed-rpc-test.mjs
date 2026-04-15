import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Read .env and .secret
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

const secretContent = fs.readFileSync('.secret', 'utf-8');
const secretLines = secretContent.split('\n');
const secret = {};
secretLines.forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...rest] = trimmed.split('=');
  if (key && rest.length > 0) {
    let value = rest.join('=').trim();
    value = value.replace(/^"(.*)"$/, '$1');
    secret[key] = value;
  }
});

console.log('=== TESTING RPC BOOKING - DETAILED DEBUG ===\n');

const anonClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

// 1. Check current appointments (as service role, bypass RLS)
const { data: allApts } = await anonClient
  .from('appointments')
  .select('id, user_id, opening_id, status, created_at');

console.log(`Total appointments in DB: ${allApts?.length || 0}`);
if (allApts) {
  console.log('Sample:', allApts.slice(0, 3).map(a => ({ id: a.id.substring(0, 8), status: a.status })));
}

const testUserId = '276a81aa-0d96-4992-9105-23c3cbb4c092';
const { data: userApts } = await anonClient
  .from('appointments')
  .select('*')
  .eq('user_id', testUserId);

console.log(`\nTest user (${testUserId.substring(0, 8)}) appointments: ${userApts?.length || 0}`);
if (userApts && userApts.length > 0) {
  userApts.forEach(a => {
    console.log(`  - ${a.id.substring(0, 8)}: opening=${a.opening_id.substring(0, 8)}, status=${a.status}`);
  });
}

// 2. Sign in test user
const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
  email: 'aaa@aaa.com',
  password: 'aaaaaa'
});

if (signInError) {
  console.log('❌ Sign-in failed:', signInError);
  process.exit(1);
}

const session = signInData.session;
console.log(`\n✅ Signed in: ${session.user.email}`);
console.log(`   UID: ${session.user.id}`);
console.log(`   Session access_token: ${session.access_token.substring(0, 20)}...`);

// Create authenticated client
const authClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  global: {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  }
});

// 3. Try to book an opening
const openingId = '3843e410-24ff-433e-ad54-10b0a64a5a44';
console.log(`\nCalling book_opening(${openingId.substring(0, 8)}, ${testUserId.substring(0, 8)})...`);

const { data: appointmentData, error: bookingError } = await authClient
  .rpc('book_opening', {
    _opening_id: openingId,
    _user_id: testUserId
  });

if (bookingError) {
  console.log('❌ RPC ERROR:');
  console.log(`   Code: ${bookingError.code}`);
  console.log(`   Message: ${bookingError.message}`);
  console.log(`   Details: ${bookingError.details}`);
  console.log(`   Hint: ${bookingError.hint}`);
  
  // Check if appointments table shows this user has any pending for this opening
  const { data: existingApt } = await anonClient
    .from('appointments')
    .select('*')
    .eq('user_id', testUserId)
    .eq('opening_id', openingId)
    .eq('status', 'pending');
  
  console.log(`\n   INVESTIGATION: pending appointments for user+opening:`);
  console.log(`   Found: ${existingApt?.length || 0} matching`);
  if (existingApt && existingApt.length > 0) {
    existingApt.forEach(a => {
      console.log(`     - ${a.id.substring(0, 8)}: created=${a.created_at}, status=${a.status}`);
    });
  }
} else {
  console.log(`✅ BOOKING SUCCESS!`);
  console.log(`   Appointment ID: ${appointmentData}`);
  
  // Verify it exists
  const { data: verifyApt } = await authClient
    .from('appointments')
    .select('*')
    .eq('id', appointmentData)
    .single();
  
  if (verifyApt) {
    console.log(`   ✅ Verified in DB: ${verifyApt.status}`);
  } else {
    console.log(`   ⚠️  Not visible via RLS (RLS policy issue?)`);
  }
}

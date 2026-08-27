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

const anonClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const serviceRoleClient = createClient(env.VITE_SUPABASE_URL, secret.SUPABASE_KEY);
const testUserId = '276a81aa-0d96-4992-9105-23c3cbb4c092';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║           COMPLETE BOOKING FLOW VERIFICATION              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// STEP 1: Clear previous test data
console.log('📋 STEP 1: Clearing previous test data...');
const { error: deleteError } = await serviceRoleClient
  .from('appointments')
  .delete()
  .eq('user_id', testUserId)
  .eq('status', 'pending');

if (deleteError) {
  console.log('❌ Failed to clear:', deleteError);
  process.exit(1);
}
console.log('✅ Cleaned up\n');

// STEP 2: Authenticate user
console.log('📋 STEP 2: Authenticating user...');
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
console.log(`   UID: ${session.user.id.substring(0, 8)}...\n`);

// STEP 3: Get available opening
console.log('📋 STEP 3: Searching for available opening...');
const { data: openings } = await anonClient
  .from('openings')
  .select('id, date, service, worker, start_time')
  .eq('service', 'Strategy')
  .eq('worker', 'Rio')
  .eq('is_available', true)
  .limit(1);

if (!openings || openings.length === 0) {
  console.log('❌ No available openings found');
  process.exit(1);
}

const opening = openings[0];
console.log(`✅ Found opening:
   ID: ${opening.id.substring(0, 8)}...
   Date: ${opening.date}
   Time: ${opening.start_time}
   Service: ${opening.service}\n`);

// STEP 4: Call RPC to book
console.log('📋 STEP 4: Calling book_opening RPC...');
const authClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  global: {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  }
});

const { data: appointmentId, error: bookingError } = await authClient
  .rpc('book_opening', {
    _opening_id: opening.id,
    _user_id: testUserId
  });

if (bookingError) {
  console.log('❌ Booking failed:', bookingError.message);
  process.exit(1);
}

console.log(`✅ Appointment created: ${appointmentId.substring(0, 8)}...\n`);

// STEP 5: Verify appointment is visible to user
console.log('📋 STEP 5: Verifying appointment visibility...');
const { data: userAppointments } = await authClient
  .from('appointments')
  .select('id, status, date, service')
  .eq('id', appointmentId);

if (!userAppointments || userAppointments.length === 0) {
  console.log('❌ Appointment not visible to user (RLS policy issue!)');
  process.exit(1);
}

const apt = userAppointments[0];
console.log(`✅ Appointment visible:
   Status: ${apt.status}
   Date: ${apt.date}
   Service: ${apt.service}\n`);

// STEP 6: Verify user can see all their appointments
console.log('📋 STEP 6: Checking user can see all appointments...');
const { data: allUserApts } = await authClient
  .from('appointments')
  .select('id, status');

console.log(`✅ User can see ${allUserApts?.length || 0} total appointments\n`);

// FINAL SUMMARY
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                  ✅ BOOKING WORKING!                       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log('Summary:');
console.log('  ✅ User authentication works');
console.log('  ✅ Openings are queryable');
console.log('  ✅ RPC booking creates appointment');
console.log('  ✅ RLS policy allows user to see own appointment');
console.log('  ✅ Database persistence verified\n');
console.log('The booking flow is FULLY OPERATIONAL.');

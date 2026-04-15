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
const providerId = 'f0927dd8-9e7d-4830-a6b5-c96a3c627fe9';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  TEST: MODIFY CONFIRMED APPOINTMENTS                      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Step 1: Clean up
console.log('📋 Step 1: Clean up old test data...');
await serviceRoleClient
  .from('appointments')
  .delete()
  .eq('user_id', testUserId);
console.log('✅ Cleaned\n');

// Step 2: Get two available openings
console.log('📋 Step 2: Get two available openings...');
const { data: openings } = await anonClient
  .from('openings')
  .select('*')
  .eq('is_available', true)
  .eq('user_id', providerId)
  .eq('worker', 'Rio')
  .limit(2);

if (!openings || openings.length < 2) {
  console.log('❌ Need at least 2 available openings');
  process.exit(1);
}

const opening1 = openings[0];
const opening2 = openings[1];
console.log(`✅ Opening 1: ${opening1.date} ${opening1.start_time}`);
console.log(`✅ Opening 2: ${opening2.date} ${opening2.start_time}\n`);

// Step 3: Sign in
console.log('📋 Step 3: Sign in...');
const { data: signInData } = await anonClient.auth.signInWithPassword({
  email: 'aaa@aaa.com',
  password: 'aaaaaa'
});

if (!signInData.session) {
  console.log('❌ Failed to sign in');
  process.exit(1);
}

const session = signInData.session;
const authClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  global: {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  }
});

console.log(`✅ Signed in\n`);

// Step 4: Book first opening
console.log('📋 Step 4: Book first opening...');
const { data: appointmentId, error: bookError } = await authClient
  .rpc('book_opening', {
    _opening_id: opening1.id,
    _user_id: testUserId
  });

if (bookError) {
  console.log('❌ Booking failed:', bookError.message);
  process.exit(1);
}

console.log(`✅ Appointment created: ${appointmentId.substring(0, 8)}...\n`);

// Step 5: Approve the appointment (as service role to simulate provider approval)
console.log('📋 Step 5: Approve appointment (confirm it)...');
const { error: approveError } = await serviceRoleClient
  .rpc('approve_appointment', {
    _appointment_id: appointmentId,
    _provider_id: providerId
  });

if (approveError) {
  console.log('❌ Approval failed:', approveError.message);
  process.exit(1);
}

console.log('✅ Appointment confirmed\n');

// Step 6: Verify appointment is confirmed
console.log('📋 Step 6: Verify appointment status...');
const { data: apt } = await authClient
  .from('appointments')
  .select('*')
  .eq('id', appointmentId)
  .single();

console.log(`   Status: ${apt.status}`);
if (apt.status !== 'confirmed') {
  console.log('❌ Appointment should be confirmed');
  process.exit(1);
}
console.log('✅ Confirmed\n');

// Step 7: Modify the CONFIRMED appointment
console.log('📋 Step 7: Modify confirmed appointment to different time...');
const { data: newAppointmentId, error: modifyError } = await authClient
  .rpc('modify_appointment', {
    _appointment_id: appointmentId,
    _new_opening_id: opening2.id,
    _caller_id: testUserId
  });

if (modifyError) {
  console.log('❌ Modify failed:', modifyError.message);
  process.exit(1);
}

console.log(`✅ Modified to new appointment: ${newAppointmentId.substring(0, 8)}...\n`);

// Step 8: Verify old appointment is cancelled
console.log('📋 Step 8: Verify old appointment is cancelled...');
const { data: oldApt } = await authClient
  .from('appointments')
  .select('*')
  .eq('id', appointmentId)
  .single();

console.log(`   Old appointment status: ${oldApt.status}`);
if (oldApt.status !== 'cancelled') {
  console.log('❌ Old appointment should be cancelled');
  process.exit(1);
}
console.log('✅ Old appointment cancelled\n');

// Step 9: Verify new appointment exists and is pending
console.log('📋 Step 9: Verify new appointment is pending (needs re-confirmation)...');
const { data: newApt } = await authClient
  .from('appointments')
  .select('*')
  .eq('id', newAppointmentId)
  .single();

console.log(`   New appointment status: ${newApt.status}`);
console.log(`   New time: ${newApt.date} ${newApt.start_time}`);

if (newApt.status !== 'pending') {
  console.log('❌ New appointment should be pending (for provider re-confirmation)');
  process.exit(1);
}
console.log('✅ New appointment is pending (waiting for re-confirmation)\n');

// Step 10: Verify first opening is available again
console.log('📋 Step 10: Verify first opening is available again...');
const { data: reOpened } = await anonClient
  .from('openings')
  .select('*')
  .eq('id', opening1.id)
  .single();

console.log(`   First opening is_available: ${reOpened.is_available}`);
if (!reOpened.is_available) {
  console.log('❌ First opening should be available again');
  process.exit(1);
}
console.log('✅ First opening re-opened\n');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║        ✅ MODIFY CONFIRMED APPOINTMENTS WORKS!            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log('Summary:');
console.log('  ✅ Can book appointment');
console.log('  ✅ Can confirm appointment');
console.log('  ✅ Can modify CONFIRMED appointment to different time');
console.log('  ✅ Old appointment is cancelled');
console.log('  ✅ New appointment is pending (awaiting re-confirmation)');
console.log('  ✅ Original opening is available again');

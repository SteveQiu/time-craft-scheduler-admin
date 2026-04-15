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
  if (!trimmed) return;
  const [key, ...rest] = trimmed.split('=');
  if (key && rest.length > 0) {
    secret[key] = rest.join('=');
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('=== TESTING RPC BOOKING ===\n');

// First, get a valid opening for Strategy + Rio + April 16 that hasn't been booked
const { data: allOpenings, error: openingError } = await supabase
  .from('openings')
  .select(`
    id, date, service, worker, is_available,
    appointments!left(id, status)
  `)
  .eq('service', 'Strategy')
  .eq('worker', 'Rio')
  .eq('date', '2026-04-16')
  .eq('is_available', true);

if (openingError || !allOpenings || allOpenings.length === 0) {
  console.log('Error finding openings:', openingError);
  process.exit(1);
}

// Find an opening with no pending bookings from this user
const testUserId = '276a81aa-0d96-4992-9105-23c3cbb4c092';
let selectedOpening = null;

for (const op of allOpenings) {
  const pendingBookings = op.appointments.filter(apt => apt.status === 'pending');
  if (pendingBookings.length === 0) {
    selectedOpening = op;
    break;
  }
}

if (!selectedOpening) {
  console.log('❌ All openings for this slot are already booked');
  // Try a different date
  const { data: otherOpenings } = await supabase
    .from('openings')
    .select('id, date')
    .eq('service', 'Strategy')
    .eq('worker', 'Rio')
    .eq('is_available', true)
    .gt('date', '2026-04-16')
    .limit(1);
  
  if (otherOpenings && otherOpenings.length > 0) {
    console.log(`Trying different date: ${otherOpenings[0].date}`);
    const { data: newOpenings } = await supabase
      .from('openings')
      .select('id')
      .eq('id', otherOpenings[0].id)
      .limit(1);
    if (newOpenings && newOpenings.length > 0) {
      selectedOpening = newOpenings[0];
    }
  }
}

if (!selectedOpening) {
  console.log('❌ Could not find any available opening');
  process.exit(1);
}

const opening = selectedOpening;
console.log(`Found opening: ${opening.id} (${opening.date || 'date'})\n`);

// Sign in as test user
console.log('Signing in as test user...');
const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
  email: 'aaa@aaa.com',
  password: 'aaaaaa'
});

if (signInError || !signIn.user) {
  console.log('Sign in failed:', signInError);
  process.exit(1);
}

console.log(`Signed in as: ${signIn.user.id} (${signIn.user.email})\n`);

// Try to call book_opening RPC
console.log('Calling book_opening RPC...');
const { data: bookingResult, error: bookingError } = await supabase.rpc('book_opening', {
  _opening_id: opening.id,
  _user_id: signIn.user.id
});

if (bookingError) {
  console.log('❌ RPC ERROR:', bookingError);
  console.log('Error details:', JSON.stringify(bookingError, null, 2));
} else {
  console.log('✅ RPC SUCCESS!');
  console.log('Result:', bookingResult);
  
  // Verify the appointment was created
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', bookingResult);
  
  if (appointments && appointments.length > 0) {
    console.log('\n✅ APPOINTMENT CREATED:');
    console.log(appointments[0]);
  } else {
    console.log('\n⚠️  Appointment ID returned but not found in DB');
  }
}

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
const TESTER1_EMAIL = secret.TESTER1_EMAIL;
const TESTER1_PASSWORD = secret.TESTER1_PASSWORD1;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('🧪 Testing book_opening() RPC with immediate lock...\n');

// Get an available opening
const { data: openings } = await supabase
  .from('openings')
  .select('*')
  .eq('is_available', true)
  .limit(1);

if (!openings || openings.length === 0) {
  console.log('❌ No available openings found');
  process.exit(1);
}

const opening = openings[0];
console.log(`Opening to test: ${opening.id}`);
console.log(`  is_available before: ${opening.is_available}\n`);

// Sign in as tester 1 to get user ID
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: TESTER1_EMAIL,
  password: TESTER1_PASSWORD
});

if (authError) {
  console.log('❌ Sign in failed:', authError.message);
  process.exit(1);
}

const userId = authData.user.id;
console.log(`Tester 1 user ID: ${userId}\n`);

// Call book_opening RPC
console.log('📞 Calling book_opening() RPC...');
const { data: appointmentId, error: bookError } = await supabase
  .rpc('book_opening', {
    _opening_id: opening.id,
    _user_id: userId
  });

if (bookError) {
  console.log(`❌ RPC Error: ${bookError.message}`);
  process.exit(1);
}

console.log(`✅ Booking successful! Appointment ID: ${appointmentId}\n`);

// Check opening status after booking
const { data: updatedOpening } = await supabase
  .from('openings')
  .select('*')
  .eq('id', opening.id);

console.log('📊 Opening status after booking:');
if (updatedOpening && updatedOpening.length > 0) {
  const o = updatedOpening[0];
  console.log(`   is_available: ${o.is_available} (should be false)`);
  
  if (o.is_available === false) {
    console.log('\n✅ SUCCESS! Opening is now marked as unavailable');
  } else {
    console.log('\n❌ PROBLEM: Opening is still available!');
  }
}

// Check appointment was created
const { data: appointments } = await supabase
  .from('appointments')
  .select('*')
  .eq('opening_id', opening.id)
  .eq('user_id', userId);

console.log(`\n📌 Appointments for this opening: ${appointments?.length || 0}`);
if (appointments && appointments.length > 0) {
  console.log(`   Status: ${appointments[0].status}`);
}

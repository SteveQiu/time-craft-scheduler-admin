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

console.log('🔍 Testing book_opening function with real booking...\n');

// Get a test opening
const { data: openings } = await supabase
  .from('openings')
  .select('*')
  .eq('is_available', true)
  .limit(1);

if (!openings || openings.length === 0) {
  console.log('❌ No available openings found');
  process.exit(1);
}

const testOpening = openings[0];
console.log(`📍 Test opening: ${testOpening.id}`);
console.log(`   is_available: ${testOpening.is_available}`);
console.log(`   provider: ${testOpening.user_id}`);

// Use tester 1 as the booking user (must not be the provider)
const testUser = 'a8f4a2cc-1e50-40c0-9e0f-2df6c7e5c12e';

console.log(`\n👤 Booking user: ${testUser}`);

if (testOpening.user_id === testUser) {
  console.log('⚠️  Test user is the provider, skipping this opening...');
  process.exit(0);
}

console.log('\n📞 Calling book_opening RPC...');

const { data: result, error: bookErr } = await supabase
  .rpc('book_opening', {
    _opening_id: testOpening.id,
    _user_id: testUser
  });

if (bookErr) {
  console.log(`❌ RPC Error: ${bookErr.message}`);
  process.exit(1);
}

console.log(`✅ Appointment created: ${result}`);

// Check opening status after booking
console.log('\n🔍 Checking opening status after booking...');

const { data: updated } = await supabase
  .from('openings')
  .select('is_available')
  .eq('id', testOpening.id);

console.log(`   is_available: ${updated?.[0]?.is_available}`);

if (updated?.[0]?.is_available === false) {
  console.log('\n✅ SUCCESS: Opening was marked unavailable!');
} else {
  console.log('\n❌ PROBLEM: Opening is still available');
  console.log('\nThe book_opening function may not be including the UPDATE statement');
}

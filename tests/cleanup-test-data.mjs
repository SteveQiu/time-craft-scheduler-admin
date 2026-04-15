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

const serviceRoleClient = createClient(env.VITE_SUPABASE_URL, secret.SUPABASE_KEY);
const testUserId = '276a81aa-0d96-4992-9105-23c3cbb4c092';

console.log('=== CLEARING TEST DATA ===\n');

// Delete all pending appointments for test user
const { error: deleteError } = await serviceRoleClient
  .from('appointments')
  .delete()
  .eq('user_id', testUserId)
  .eq('status', 'pending');

if (deleteError) {
  console.log('❌ Delete error:', deleteError);
  process.exit(1);
}

console.log('✅ Deleted all pending appointments for test user');

// Verify
const { data: remaining } = await serviceRoleClient
  .from('appointments')
  .select('id')
  .eq('user_id', testUserId);

console.log(`✅ Test user now has ${remaining?.length || 0} appointments\n`);

// Mark all previously booked openings as available again
const { data: bookedOpenings } = await serviceRoleClient
  .from('openings')
  .select('id')
  .eq('is_available', false)
  .in('id', ['3843e410-24ff-433e-ad54-10b0a64a5a44']); // the opening we were testing

if (bookedOpenings && bookedOpenings.length > 0) {
  const { error: resetError } = await serviceRoleClient
    .from('openings')
    .update({ is_available: true })
    .in('id', bookedOpenings.map(o => o.id));
  
  if (resetError) {
    console.log('❌ Reset opening error:', resetError);
  } else {
    console.log(`✅ Re-opened ${bookedOpenings.length} bookings\n`);
  }
}

console.log('Ready to test booking again!');

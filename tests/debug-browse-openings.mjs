import { requireTestSecret } from './testCredentials.js';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env file
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

// Read .secret file
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
const SUPABASE_SECRET_KEY = secret.SUPABASE_KEY;

console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY.substring(0, 30) + '...');
console.log('SUPABASE_SECRET_KEY:', SUPABASE_SECRET_KEY.substring(0, 30) + '...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



console.log('=== DEBUG BROWSE OPENINGS ===\n');

const today = new Date().toISOString().split('T')[0];
console.log(`Today's date: ${today}\n`);

// 1. Check all openings with is_available = true and date >= today
console.log('1. Checking all available openings (ANON)...');
const { data: allOpenings, error: err1 } = await supabase
  .from('openings')
  .select('id, user_id, date, is_available')
  .eq('is_available', true)
  .gte('date', today)
  .order('date', { ascending: true })
  .limit(5);

if (err1) {
  console.log('   Error:', err1);
} else {
  console.log(`   Found ${allOpenings?.length || 0} openings`);
  if (allOpenings && allOpenings.length > 0) {
    console.log('   Sample openings:');
    allOpenings.slice(0, 3).forEach(o => {
      console.log(`     - ${o.id}: ${o.date} (provider: ${o.user_id}, is_available: ${o.is_available})`);
    });
  }
}

// 2. Check for confirmed appointments
console.log('\n2. Checking confirmed appointments...');
const { data: confirmedAppts, error: err2 } = await supabase
  .from('appointments')
  .select('id, opening_id, status')
  .eq('status', 'confirmed');

if (err2) {
  console.log('   Error:', err2);
} else {
  console.log(`   Found ${confirmedAppts?.length || 0} confirmed appointments`);
  if (confirmedAppts && confirmedAppts.length > 0) {
    console.log('   Sample appointments:');
    confirmedAppts.slice(0, 3).forEach(a => {
      console.log(`     - ${a.id}: opening ${a.opening_id}, status: ${a.status}`);
    });
  }
}

// 3. Check specific provider f0927dd8-9e7d-4830-a6b5-c96a3c627fe9
console.log('\n3. Checking specific provider openings...');
const providerId = 'f0927dd8-9e7d-4830-a6b5-c96a3c627fe9';
const { data: providerOpenings, error: err3 } = await supabase
  .from('openings')
  .select('id, user_id, date, is_available')
  .eq('user_id', providerId)
  .eq('is_available', true)
  .gte('date', today)
  .limit(5);

if (err3) {
  console.log('   Error:', err3);
} else {
  console.log(`   Found ${providerOpenings?.length || 0} openings for provider ${providerId}`);
  if (providerOpenings && providerOpenings.length > 0) {
    console.log('   Sample openings:');
    providerOpenings.slice(0, 3).forEach(o => {
      console.log(`     - ${o.id}: ${o.date}`);
    });
  }
}

// 4. Check provider profile
console.log('\n4. Checking provider profile...');
const { data: providerProfile, error: err4 } = await supabase
  .from('profiles')
  .select('id, full_name, email')
  .eq('id', providerId);

if (err4) {
  console.log('   Error:', err4);
} else {
  console.log(`   Provider info:`, providerProfile);
}

// 5. Check RLS access - try via authenticated user
console.log('\n5. Testing via authenticated user (aaa@aaa.com)...');
const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email: 'aaa@aaa.com',
  password: requireTestSecret('TESTER1_PASSWORD1')
});

if (signInError) {
  console.log('   Sign in failed:', signInError);
} else {
  console.log('   Signed in as:', signInData.user?.id);
  
  // Try to access openings with authenticated session
  const { data: authOpenings, error: authErr } = await supabase
    .from('openings')
    .select('id, user_id, date')
    .eq('is_available', true)
    .gte('date', today)
    .limit(3);
  
  if (authErr) {
    console.log('   Error fetching openings:', authErr);
  } else {
    console.log(`   Found ${authOpenings?.length || 0} openings as authenticated user`);
  }
}

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
const testUserId = '276a81aa-0d96-4992-9105-23c3cbb4c092';

console.log('=== TEST: Exact Browse Page Query ===\n');

// Step 1: Sign in
console.log('Step 1: Signing in...');
const { data: signInData } = await anonClient.auth.signInWithPassword({
  email: 'aaa@aaa.com',
  password: requireTestSecret('TESTER1_PASSWORD1')
});

if (!signInData.session) {
  console.log('❌ Failed to sign in');
  process.exit(1);
}

console.log(`✅ Signed in\n`);

// Step 2: Fetch openings (exact query from BookingBrowse.tsx)
console.log('Step 2: Fetching openings (as ANON, exactly as UI does)...');

const today = new Date().toISOString().split('T')[0];
const { data: openings, error: openError } = await anonClient
  .from('openings')
  .select('*')
  .eq('is_available', true)
  .gte('date', today)
  .order('date', { ascending: true })
  .order('start_time', { ascending: true });

if (openError) {
  console.log('❌ Error fetching openings:', openError);
  process.exit(1);
}

console.log(`✅ Fetched ${openings?.length || 0} openings\n`);

if (!openings || openings.length === 0) {
  console.log('ERROR: No openings returned!');
  console.log('This explains why browse page shows "No appointments available"\n');
  
  // Try without the is_available filter
  console.log('Trying without is_available filter...');
  const { data: allOpenings } = await anonClient
    .from('openings')
    .select('*')
    .gte('date', today)
    .limit(5);
  
  console.log(`Found ${allOpenings?.length || 0} openings (no filter):`);
  if (allOpenings && allOpenings.length > 0) {
    allOpenings.slice(0, 3).forEach(o => {
      console.log(`  - ${o.id.substring(0, 8)}: ${o.service} / ${o.worker}, available=${o.is_available}, date=${o.date}`);
    });
  }
} else {
  console.log(`Showing first 3 openings:`);
  openings.slice(0, 3).forEach(o => {
    console.log(`  - ${o.id.substring(0, 8)}: ${o.service} / ${o.worker}, available=${o.is_available}, date=${o.date}`);
  });
  
  console.log(`\n✅ BROWSE PAGE SHOULD WORK - Openings are loading correctly`);
}

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

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

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('=== CHECKING FOR NEW APPOINTMENTS ===\n');

// Check for appointments for the test user (aaa@aaa.com = 276a81aa-0d96-4992-9105-23c3cbb4c092)
const testUserId = '276a81aa-0d96-4992-9105-23c3cbb4c092';

const { data: appointments, error } = await supabase
  .from('appointments')
  .select('id, opening_id, user_id, provider_id, status, date, created_at')
  .eq('user_id', testUserId)
  .order('created_at', { ascending: false })
  .limit(5);

if (error) {
  console.log('Error:', error);
} else {
  console.log(`Found ${appointments?.length || 0} recent appointments for test user\n`);
  
  if (appointments && appointments.length > 0) {
    appointments.forEach((apt, i) => {
      console.log(`${i + 1}. Appointment:${apt.created_at}`);
      console.log(`   ID: ${apt.id}`);
      console.log(`   Status: ${apt.status}`);
      console.log(`   Date: ${apt.date}`);
      console.log(`   Provider: ${apt.provider_id}`);
      console.log(`   Opening: ${apt.opening_id}\n`);
    });
    
    const latest = appointments[0];
    if (latest) {
      console.log(`✅ SUCCESS! Latest appointment created at ${latest.created_at}`);
      console.log(`   Status: ${latest.status}`);
      console.log(`   This was likely from the test!`);
    }
  } else {
    console.log('⚠️  No appointments found for test user');
  }
}

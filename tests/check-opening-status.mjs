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

console.log('🔍 Checking opening 7689d53a-92e6-42fc-970f-9dbc3b15c3a2...\n');

const openingId = '7689d53a-92e6-42fc-970f-9dbc3b15c3a2';

// Check opening status
const { data: opening } = await supabase
  .from('openings')
  .select('*')
  .eq('id', openingId);

console.log('📋 Opening status:');
if (opening && opening.length > 0) {
  const o = opening[0];
  console.log(`   ID: ${o.id}`);
  console.log(`   is_available: ${o.is_available}`);
  console.log(`   Date: ${o.date}`);
  console.log(`   Time: ${o.start_time} - ${o.end_time}`);
  console.log(`   Service: ${o.service}`);
} else {
  console.log('   ❌ Opening not found!');
}

// Check appointments for this opening
const { data: appointments } = await supabase
  .from('appointments')
  .select('*')
  .eq('opening_id', openingId);

console.log(`\n📌 Appointments for this opening (${appointments?.length || 0}):`);
if (appointments && appointments.length > 0) {
  appointments.forEach((apt, i) => {
    console.log(`   ${i + 1}. Status: ${apt.status}`);
    console.log(`      User: ${apt.user_id}`);
    console.log(`      Created: ${apt.created_at}`);
  });
} else {
  console.log('   (No appointments found)');
}

console.log('\n❌ ISSUE:');
if (opening && opening.length > 0 && opening[0].is_available) {
  console.log('   Opening is_available = true (should be false after booking)');
  
  if (appointments && appointments.length > 0) {
    console.log('   BUT there ARE appointments for this opening');
    console.log('   \n   PROBLEM: Booking was created but opening status NOT updated!');
  } else {
    console.log('   AND no appointments found');
    console.log('   \n   PROBLEM: Either booking failed OR opening data is wrong');
  }
}

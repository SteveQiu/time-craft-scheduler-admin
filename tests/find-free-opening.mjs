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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const testUserId = '276a81aa-0d96-4992-9105-23c3cbb4c092';

console.log('=== FINDING BOOKABLE OPENINGS ===\n');

// Get all pending/confirmed appointments for this user
const { data: userAppointments, error: aptError } = await supabase
  .from('appointments')
  .select('id, opening_id, status, created_at')
  .eq('user_id', testUserId);

if (aptError) {
  console.log('Error fetching appointments:', aptError);
  process.exit(1);
}

console.log(`User has ${userAppointments.length} appointments total`);

// Group by opening_id to see which openings are booked
const bookedOpenings = new Set();
userAppointments.forEach(apt => {
  bookedOpenings.add(apt.opening_id);
});

console.log(`Booked openings: ${bookedOpenings.size}\n`);

// Now get all Strategy + Rio openings
const { data: allOpenings, error: openError } = await supabase
  .from('openings')
  .select('id, date, service, worker, is_available')
  .eq('service', 'Strategy')
  .eq('worker', 'Rio')
  .eq('is_available', true);

if (openError) {
  console.log('Error fetching openings:', openError);
  process.exit(1);
}

console.log(`Found ${allOpenings.length} available Strategy+Rio openings\n`);

// Find the first one not in bookedOpenings
let freeOpening = null;
for (const op of allOpenings) {
  if (!bookedOpenings.has(op.id)) {
    freeOpening = op;
    break;
  }
}

if (freeOpening) {
  console.log('✅ FOUND FREE OPENING:');
  console.log(`   ID: ${freeOpening.id}`);
  console.log(`   Date: ${freeOpening.date}`);
  console.log(`   Service: ${freeOpening.service}`);
  console.log(`   Worker: ${freeOpening.worker}`);
} else {
  console.log('❌ NO FREE OPENINGS - all are booked!');
  console.log('\nBooked dates:');
  const bookedByDate = {};
  userAppointments.forEach(apt => {
    const opening = allOpenings.find(o => o.id === apt.opening_id);
    if (opening) {
      if (!bookedByDate[opening.date]) bookedByDate[opening.date] = [];
      bookedByDate[opening.date].push({
        id: apt.id,
        status: apt.status,
        created_at: apt.created_at.substring(0, 10)
      });
    }
  });
  
  Object.entries(bookedByDate).forEach(([date, apts]) => {
    console.log(`  ${date}: ${apts.length} appointment(s)`);
  });
}

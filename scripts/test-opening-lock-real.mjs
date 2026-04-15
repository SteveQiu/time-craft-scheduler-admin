#!/usr/bin/env node

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

console.log('🧪 TESTING OPENING LOCK MIGRATION');
console.log('='.repeat(70));
console.log('');

(async () => {
  try {
    // 1. Get an available opening
    console.log('Step 1: Finding an available opening...');
    const { data: openings, error: openingsError } = await supabase
      .from('openings')
      .select('id, is_available, user_id, worker, service, date, start_time, end_time, location, duration')
      .eq('is_available', true)
      .limit(1);

    if (openingsError) throw openingsError;
    if (!openings || openings.length === 0) {
      console.log('❌ No available openings found');
      process.exit(1);
    }

    const opening = openings[0];
    console.log(`✅ Found opening: ${opening.id}`);
    console.log(`   Service: ${opening.service} | Worker: ${opening.worker}`);
    console.log(`   Date: ${opening.date} | Time: ${opening.start_time}-${opening.end_time}`);
    console.log(`   Available: ${opening.is_available}`);
    console.log('');

    // 2. Get a test user
    console.log('Step 2: Getting test user...');
    const { data: { user }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      // Try getting current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.log('❌ No authenticated user');
        process.exit(1);
      }
      console.log(`✅ Using authenticated user: ${currentUser.id}`);
      console.log('');

      // 3. Book the opening
      console.log('Step 3: Booking opening via RPC...');
      const { data: appointmentId, error: bookError } = await supabase.rpc('book_opening', {
        _opening_id: opening.id,
        _user_id: currentUser.id
      });

      if (bookError) {
        console.log(`❌ Booking failed: ${bookError.message}`);
        process.exit(1);
      }

      console.log(`✅ Booking succeeded! Appointment ID: ${appointmentId}`);
      console.log('');

      // 4. Check if opening is now locked
      console.log('Step 4: Verifying opening is now unavailable...');
      const { data: updatedOpening, error: checkError } = await supabase
        .from('openings')
        .select('is_available')
        .eq('id', opening.id)
        .single();

      if (checkError) throw checkError;
      
      if (updatedOpening.is_available) {
        console.log('❌ FAILED: Opening is still available!');
        process.exit(1);
      }

      console.log(`✅ SUCCESS: Opening is now locked (is_available = false)`);
      console.log('');
      console.log('🎉 MIGRATION WORKS CORRECTLY!');
      console.log('');
      console.log('Next: Test in browser');
      console.log('  npm run dev');
    } else {
      console.log('✅ Found users');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();

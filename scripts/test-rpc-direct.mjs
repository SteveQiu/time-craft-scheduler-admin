#!/usr/bin/env node

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse config
const env = {};
fs.readFileSync('.env', 'utf-8').split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [k, ...rest] = line.split('=');
    env[k] = rest.join('=').trim().replace(/^"|"$/g, '');
  }
});

const secret = {};
fs.readFileSync('.secret', 'utf-8').split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('=')) {
    const [k, ...rest] = line.split('=');
    secret[k] = rest.join('=');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, secret.SUPABASE_KEY);

(async () => {
  const testUserId = 'bb53fda3-cb29-4667-b414-b6378ce44675';
  const testOpeningId = 'deb3695a-e070-41d3-ae43-b96d2373980c';
  
  console.log('🧪 Testing book_opening() RPC');
  console.log('Opening:', testOpeningId);
  console.log('User:', testUserId);
  console.log('');
  
  const { data, error } = await supabase.rpc('book_opening', {
    _opening_id: testOpeningId,
    _user_id: testUserId
  });
  
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✅ Booked! Appointment:', data);
  }
  
  const { data: opening } = await supabase
    .from('openings')
    .select('is_available')
    .eq('id', testOpeningId)
    .single();
    
  console.log('Opening locked:', !opening?.is_available);
})();

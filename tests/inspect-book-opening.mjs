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

console.log('🔍 Checking current book_opening function definition...\n');

// Query the information_schema to see the function source
const { data, error } = await supabase
  .rpc('sql', {
    query: `
      SELECT 
        routine_name,
        routine_type,
        routine_definition
      FROM information_schema.routines
      WHERE routine_name = 'book_opening'
      AND routine_schema = 'public'
    `
  })
  .catch(() => ({ data: null, error: { message: 'SQL function not available' } }));

if (error) {
  console.log('Cannot query via SQL function, trying alternative...\n');
  
  // Alternative: use a simple test to see what the function does
  console.log('Testing book_opening with real data...');
  
  // Get a test opening
  const { data: openings } = await supabase
    .from('openings')
    .select('*')
    .limit(1);
  
  if (openings && openings.length > 0) {
    const testOpening = openings[0];
    console.log(`Test opening ID: ${testOpening.id}`);
    console.log(`Is available: ${testOpening.is_available}`);
    
    // Get a test user (from secret)
    const testUser = 'a8f4a2cc-1e50-40c0-9e0f-2df6c7e5c12e'; // tester 1
    
    // Try to book
    console.log(`\nAttempting to book with user: ${testUser}`);
    
    const { data: result, error: bookErr } = await supabase
      .rpc('book_opening', {
        _opening_id: testOpening.id,
        _user_id: testUser
      });
    
    if (bookErr) {
      console.log(`Error: ${bookErr.message}`);
    } else {
      console.log(`Appointment created: ${result}`);
      
      // Check if opening was updated
      const { data: updated } = await supabase
        .from('openings')
        .select('is_available')
        .eq('id', testOpening.id);
      
      console.log(`Opening is_available after: ${updated?.[0]?.is_available}`);
    }
  }
} else {
  console.log('Function definition:');
  console.log(JSON.stringify(data, null, 2));
}

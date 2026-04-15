#!/usr/bin/env node
/**
 * Check if RPC functions exist in Supabase
 * This script queries the schema to verify migrations were applied
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
const envFile = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envFile, 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/)?.[1];
const publishableKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)?.[1];

if (!supabaseUrl || !publishableKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, publishableKey);

console.log('🔍 CHECKING SUPABASE RPC FUNCTIONS\n');
console.log('='.repeat(80));

(async () => {
  try {
    // Try to call the function to see what error we get
    console.log('Testing: book_opening(...)');
    
    const { data, error } = await supabase.rpc('book_opening', {
      _opening_id: '00000000-0000-0000-0000-000000000000',
      _user_id: '00000000-0000-0000-0000-000000000001'
    });
    
    if (error) {
      console.log('\n❌ Error from RPC call:');
      console.log(JSON.stringify(error, null, 2));
      
      if (error.code === 'PGRST202') {
        console.log('\n🔴 CRITICAL: Function not found in schema cache!');
        console.log('\nPossible causes:');
        console.log('1. Migration did not apply correctly');
        console.log('2. Supabase needs more time to refresh cache');
        console.log('3. Wrong SQL was pasted (check for syntax errors)');
        console.log('\nSolutions:');
        console.log('1. Check Supabase SQL Editor for errors');
        console.log('2. Try again in 30 seconds');
        console.log('3. Go to Project Settings and Restart project again');
        console.log('4. Check the function exists:');
        console.log('   Dashboard → Editor → Query');
        console.log('   SELECT proname, pronargs FROM pg_proc WHERE proname = \'book_opening\'');
      }
    } else {
      console.log('\n✅ Function exists and accepted the call!');
      console.log('Data:', data);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\nTo verify manually:');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. SQL Editor → New Query');
  console.log('3. Run: SELECT proname, pronargs FROM pg_proc WHERE proname IN (\'book_opening\', \'approve_appointment\', \'cancel_appointment\')');
  console.log('4. Check if functions are listed\n');
})();

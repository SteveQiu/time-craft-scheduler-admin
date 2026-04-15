#!/usr/bin/env node
/**
 * Query Supabase schema to see if functions were created
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env to get Supabase credentials
const envFile = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envFile, 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/)?.[1];
const publishableKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)?.[1];

if (!supabaseUrl || !publishableKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, publishableKey);

console.log('🔍 QUERYING SUPABASE SCHEMA\n');

(async () => {
  try {
    // Try different ways to verify functions exist
    
    // Method 1: Try to check function existence with a raw SQL approach
    console.log('Method 1: Try calling book_opening with test data...');
    const { data: testData, error: testError } = await supabase.rpc('book_opening', {
      _opening_id: '00000000-0000-0000-0000-000000000000',
      _user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (testError) {
      if (testError.code === 'P0001') {
        console.log('✅ Function EXISTS! Error is P0001 (business logic error)');
        console.log('   Message:', testError.message);
      } else if (testError.code === 'PGRST202') {
        console.log('❌ Function NOT FOUND (PGRST202)');
        console.log('   Message:', testError.message);
      } else {
        console.log('⚠️  Different error:', testError.code);
        console.log('   Message:', testError.message);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('To manually verify in Supabase:');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. SQL Editor → New Query');
    console.log('4. Run these queries:\n');
    console.log('-- Check if functions exist:');
    console.log('SELECT proname, pronargs, prosrc FROM pg_proc WHERE proname IN (\'book_opening\', \'approve_appointment\', \'cancel_appointment\') ORDER BY proname;');
    console.log('\n-- Check recent functions:');
    console.log('SELECT proname, pronargs FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = \'public\') ORDER BY proname DESC LIMIT 20;');
    console.log('\n' + '='.repeat(80));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();

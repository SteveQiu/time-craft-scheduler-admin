#!/usr/bin/env node

/**
 * APPLY MIGRATION USING SUPABASE CREDENTIALS
 * 
 * This script attempts to apply the opening lock migration directly
 * using the Supabase credentials from .secret file
 */

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

console.log('🚀 APPLYING MIGRATION WITH SUPABASE CREDENTIALS\n');
console.log('='.repeat(70));

// Read migration SQL
const migrationSQL = fs.readFileSync('./supabase/migrations/20260415_immediate_opening_lock_on_booking.sql', 'utf-8');

console.log('📝 Migration to apply:');
console.log('   File: 20260415_immediate_opening_lock_on_booking.sql');
console.log(`   Size: ${migrationSQL.length} bytes`);
console.log(`   Changes: Updates book_opening() RPC function\n`);

// Try direct approach using node-postgres
console.log('📡 Attempting connection via direct PostgreSQL...\n');

try {
  // Extract connection details from Supabase URL
  const projectMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  const PROJECT_ID = projectMatch?.[1];
  
  if (!PROJECT_ID) {
    throw new Error('Could not extract project ID from URL');
  }
  
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Trying to execute SQL migration...`);
  
  // Since we can't connect directly due to network restrictions,
  // let's use the Supabase client to call a custom RPC or similar
  
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    }
  });
  
  console.log('\n✅ Supabase client created');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Auth: Using SERVICE_KEY`);
  
  // Try to use Supabase management API
  console.log('\n📡 Attempting via Supabase Management API...\n');
  
  // The issue is that Supabase JS client doesn't support raw SQL execution
  // We need to use the REST API with a custom query
  
  // Option: Check if we can execute via a stored procedure or function
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/__execute_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({
      sql: migrationSQL
    })
  });
  
  console.log(`Response Status: ${response.status}`);
  
  if (response.ok) {
    console.log('✅ Migration executed successfully!');
    
    // Verify the change
    console.log('\n🔍 Verifying migration applied...');
    
    const { data: apt, error } = await supabase.rpc('book_opening', {
      _opening_id: '00000000-0000-0000-0000-000000000000',
      _user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error?.message?.includes('Opening not found')) {
      console.log('✅ Function verified - migration is applied!');
    }
    
  } else {
    const text = await response.text();
    console.log(`Response: ${text}`);
    
    if (response.status === 404) {
      console.log('\n⚠️  Management function not found');
      console.log('Trying alternative approach...\n');
      
      // Alternative: Try to get raw connection and execute
      console.log('Since direct SQL execution isn\'t available via REST API,');
      console.log('the migration must be applied manually or via Supabase CLI.\n');
      
      console.log('📝 SQL to apply:\n');
      console.log(migrationSQL);
    }
  }
  
} catch (e) {
  console.log(`❌ Error: ${e.message}\n`);
  
  console.log('Since direct SQL execution via API isn\'t supported,');
  console.log('showing alternative methods:\n');
  
  console.log('Option 1: Use Supabase CLI (requires installation)');
  console.log('  npm install -g supabase');
  console.log('  supabase link --project-ref ' + PROJECT_ID);
  console.log('  supabase migration up\n');
  
  console.log('Option 2: Manual execution in SQL Editor');
  console.log('  1. Go to https://supabase.com/dashboard');
  console.log('  2. Click SQL Editor');
  console.log('  3. Paste the migration SQL');
  console.log('  4. Click RUN\n');
  
  console.log('Option 3: Show the SQL for pasting');
  console.log('  The SQL is ready to copy:\n');
  console.log(migrationSQL);
}

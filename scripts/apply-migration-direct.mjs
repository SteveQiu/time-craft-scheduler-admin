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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

console.log('🚀 Applying migration: 20260415_immediate_opening_lock_on_booking\n');

// Read the migration
const migrationSQL = fs.readFileSync('./supabase/migrations/20260415_immediate_opening_lock_on_booking.sql', 'utf-8');

// Split into individual statements (careful with stored procedures)
// For stored procedures, we need to keep them as single statements
const statements = [];
let currentStatement = '';
let inFunction = false;

const lines = migrationSQL.split('\n');
for (const line of lines) {
  if (line.includes('CREATE OR REPLACE FUNCTION')) {
    inFunction = true;
  }
  
  currentStatement += line + '\n';
  
  if (inFunction) {
    if (line.trim() === '$$;') {
      statements.push(currentStatement);
      currentStatement = '';
      inFunction = false;
    }
  } else {
    if (line.trim().endsWith(';') && line.trim().length > 1) {
      statements.push(currentStatement);
      currentStatement = '';
    }
  }
}

console.log(`📋 Executing ${statements.length} statements...\n`);

let successCount = 0;
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i].trim();
  if (!stmt) continue;
  
  console.log(`[${i+1}/${statements.length}] Executing statement...`);
  
  try {
    // Try using pg_execute from a custom RPC if available, or directly execute
    const shortStmt = stmt.substring(0, 50).replace(/\n/g, ' ');
    
    // We'll use a workaround: fetch via REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        sql: stmt
      })
    });
    
    if (response.status === 404) {
      console.log(`   ⚠️  RPC method not available, trying alternative...`);
      // If RPC doesn't work, we need to use pg_stat_statements or similar
      break;
    }
    
    if (response.ok) {
      console.log(`   ✅ Success`);
      successCount++;
    } else {
      const text = await response.text();
      console.log(`   ⚠️  Status ${response.status}: ${text}`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
}

console.log(`\n✅ Processed ${successCount} statements`);

if (successCount === 0) {
  console.log('\n⚠️  Could not apply migration via API');
  console.log('\nManual steps required:');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Click "SQL Editor"');
  console.log('4. Click "New query"');
  console.log('5. Run this command:\n');
  
  // Show formatted SQL
  console.log(migrationSQL);
}

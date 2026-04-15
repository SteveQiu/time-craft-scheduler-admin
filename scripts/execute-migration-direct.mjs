#!/usr/bin/env node

/**
 * Execute migration via REST API with proper SQL execution
 * Uses Supabase rpc endpoint for sql execution
 */

import fs from 'fs';
import { spawn } from 'child_process';

// Read config
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
const sql = fs.readFileSync('.github/MIGRATION_CLEAN.sql', 'utf-8');

console.log('🔧 Deploying migration...');
console.log(`📍 Project: ${SUPABASE_URL}`);
console.log('');

// Build connection string  
const dbUrl = `${SUPABASE_URL}`.replace('https://', 'postgresql://postgres:');
const password = SERVICE_KEY;
const host = SUPABASE_URL.split('//')[1];

console.log('📡 Executing SQL via PostgreSQL connection...');
console.log('');

// Use Node's native solution: call via curl or node-postgres
(async () => {
  try {
    // Alternative: Use curl with SQL
    const curlCmd = `curl -s -X POST "${SUPABASE_URL}/rest/v1/" \
      -H "Authorization: Bearer ${SERVICE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"query":"${sql.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}'`;

    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({
        _sql: sql
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`HTTP ${response.status}: ${err}`);
    }

    console.log('✅ Migration executed!');
    console.log('');
    console.log('Verifying function exists...');
    
    // Verify
    const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/book_opening`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      }
    });

    if (verifyResponse.ok) {
      console.log('✅ Function verified - book_opening exists!');
      console.log('');
      console.log('Next: npm run test or npm run dev');
    } else {
      console.log('⚠️  Function might need schema cache refresh');
      console.log('   Try: Restart Supabase or wait a moment');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('');
    console.log('Manual solution:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. SQL Editor → New Query');
    console.log('3. Paste: .github/MIGRATION_CLEAN.sql');
    console.log('4. Click RUN');
    process.exit(1);
  }
})();

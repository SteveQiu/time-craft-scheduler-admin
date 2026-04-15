#!/usr/bin/env node

/**
 * Direct migration application via REST API
 * This executes raw SQL through Supabase REST API
 */

import fs from 'fs';

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

console.log('📡 Deploying migration via REST API...');
console.log('');

(async () => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Migration deployed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('  1. Run: node tests/verify-opening-lock.mjs');
      console.log('  2. Test in browser: npm run dev');
      process.exit(0);
    } else {
      console.log('❌ Deployment failed:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      console.log('Try alternative: Use Supabase CLI');
      console.log('  npx supabase db push');
      process.exit(1);
    }
  } catch (err) {
    console.log('❌ Error:');
    console.log(err.message);
    console.log('');
    console.log('Fallback: Manual deployment');
    console.log('  1. Go to https://supabase.com/dashboard');
    console.log('  2. SQL Editor → New Query');
    console.log('  3. Copy: .github/MIGRATION_CLEAN.sql');
    console.log('  4. Paste and click RUN');
    process.exit(1);
  }
})();

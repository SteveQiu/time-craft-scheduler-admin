#!/usr/bin/env node

/**
 * Check if test user account exists and can sign in
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read credentials
const secretFile = path.join(__dirname, '../.secret');
const secretContent = fs.readFileSync(secretFile, 'utf-8');
const secrets = {};
secretContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    secrets[key.trim()] = value.trim();
  }
});

const SUPABASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co';
const ADMIN_KEY = secrets.SUPABASE_KEY;
const ANON_KEY = secrets.SUPABASE_Publishable_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔑 Test Account Verification\n');

(async () => {
  try {
    console.log('1. Try to sign in with aaa@aaa.com');
    
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'aaa@aaa.com',
        password: 'aaaaaa'
      })
    });

    console.log(`   Status: ${res.status}`);
    const data = await res.json();
    
    if (res.ok) {
      console.log(`   ✅ SUCCESS! Login works`);
      console.log(`   User ID: ${data.user.id}`);
    } else {
      console.log(`   ❌ FAILED! ${data.error_description || data.error}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();

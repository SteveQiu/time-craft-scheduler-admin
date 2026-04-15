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

console.log('🔍 Checking current function status...');
console.log('');

(async () => {
  try {
    // Try to call the function with dummy values to see if it exists
    const { data, error } = await supabase.rpc('book_opening', {
      _opening_id: '00000000-0000-0000-0000-000000000000',
      _user_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error) {
      console.log('❌ Function Error:', error.message);
      console.log('   Code:', error.code);
      
      if (error.code === 'PGRST202') {
        console.log('');
        console.log('⚠️  Function NOT FOUND in database');
        console.log('');
        console.log('This means the SQL you pasted did NOT execute.');
        console.log('');
        console.log('Possible reasons:');
        console.log('1. Syntax error in SQL - check for encoding issues');
        console.log('2. Transaction rolled back');
        console.log('3. Permissions issue');
        console.log('');
        console.log('Try again:');
        console.log('1. Go to SQL Editor');
        console.log('2. Click "Clear"');
        console.log('3. Copy fresh: cat .github/MIGRATION_CLEAN.sql');
        console.log('4. Paste and RUN');
      }
    } else {
      console.log('✅ Function EXISTS and is callable!');
      console.log('   Response:', data);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();

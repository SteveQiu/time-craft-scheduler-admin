#!/usr/bin/env node

/**
 * Check RLS policies and table permissions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read credentials
const secretFile = path.join(__dirname, '.secret');
const secretContent = fs.readFileSync(secretFile, 'utf-8');
const secrets = {};
secretContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    secrets[key.trim()] = value.trim();
  }
});

const SUPABASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co';
const SUPABASE_KEY = secrets.SUPABASE_KEY;

console.log('🔍 Checking RLS Policies');
console.log('========================\n');

// Try different queries to understand RLS
async function testQuery(name, query) {
  console.log(`\n📝 Test: ${name}`);
  console.log('---');
  
  const url = `${SUPABASE_URL}/rest/v1/${query}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Status: ${response.status}`);
    
    const data = await response.json();
    if (Array.isArray(data)) {
      console.log(`Result: ${data.length} rows`);
      if (data.length > 0) {
        console.log(`Sample: ${JSON.stringify(data[0])}`);
      }
    } else if (data.message) {
      console.log(`Message: ${data.message}`);
      if (data.code) console.log(`Code: ${data.code}`);
      if (data.hint) console.log(`Hint: ${data.hint}`);
    } else {
      console.log(`Response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

(async () => {
  // Test 1: openings table
  await testQuery('List openings (no filter)', 'openings?limit=1');
  
  // Test 2: profiles table
  await testQuery('List profiles', 'profiles?limit=1');
  
  // Test 3: appointments table
  await testQuery('List appointments', 'appointments?limit=1');
  
  // Test 4: Check if service_workers table exists
  await testQuery('List service_workers', 'service_workers?limit=1');
  
  console.log('\n' + '='.repeat(50));
  console.log('Analysis:');
  console.log('='.repeat(50));
  console.log(`
If all returned 401:
- RLS is enabled and BLOCKING anonymous/unauthenticated access
- The API key is a SERVICE ROLE key (should bypass RLS but doesn't seem to work)
- Need to use ANON key instead, or authenticate properly

If some returned 401 and others returned data:
- RLS policies are inconsistent
- Some tables allow public access, others don't

If all returned data:
- RLS is not blocking at this level
- Problem is elsewhere
  `);
})();

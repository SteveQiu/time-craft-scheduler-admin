#!/usr/bin/env node

/**
 * Test the book_opening RPC function directly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYWJqZnlkY2xscWJqcG9saHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzk1OTYsImV4cCI6MjA2ODYxNTU5Nn0.SyYn3n9-sA9A2gwoIgY06oHHRg8Lfw1p3XNjV7Dadys';

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

console.log('🔧 RPC Testing - book_opening');
console.log('==============================\n');

// Get first available opening
async function getFirstOpening() {
  const url = `${SUPABASE_URL}/rest/v1/openings?is_available=eq.true&select=id&limit=1`;
  const response = await fetch(url, {
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    }
  });
  const data = await response.json();
  return data.length > 0 ? data[0].id : null;
}

// Get a test user ID (we need one that exists)
async function getTestUserId() {
  // Try to get any user from profiles
  const url = `${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`;
  const response = await fetch(url, {
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    }
  });
  const data = await response.json();
  if (data.length > 0) {
    return data[0].id;
  }
  
  // If no profiles, create a fake UUID for testing
  // (will fail with auth error if RLS is checking)
  return '00000000-0000-0000-0000-000000000000';
}

// Test RPC function
async function testRPC() {
  console.log('📞 STEP 1: Get test data');
  console.log('---');
  
  const openingId = await getFirstOpening();
  const userId = await getTestUserId();
  
  console.log(`Opening ID: ${openingId}`);
  console.log(`User ID: ${userId}`);
  
  if (!openingId) {
    console.log('❌ No openings found!');
    return;
  }
  
  console.log('\n📞 STEP 2: Call book_opening RPC');
  console.log('---');
  
  const url = `${SUPABASE_URL}/rest/v1/rpc/book_opening`;
  const body = {
    _opening_id: openingId,
    _user_id: userId
  };
  
  console.log(`Request: ${JSON.stringify(body, null, 2)}`);
  console.log(`Headers: apikey = ${ANON_KEY.substring(0, 20)}...`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    console.log(`\nStatus: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`Response body: ${responseText}`);
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      console.log(`\nParsed response: ${JSON.stringify(data, null, 2)}`);
      
      if (response.ok) {
        console.log('\n✅ RPC call succeeded!');
        console.log(`Appointment ID: ${data}`);
      } else {
        console.log('\n❌ RPC call failed!');
        if (data.code) console.log(`Code: ${data.code}`);
        if (data.message) console.log(`Message: ${data.message}`);
        if (data.hint) console.log(`Hint: ${data.hint}`);
        if (data.details) console.log(`Details: ${data.details}`);
      }
    } catch {
      if (response.ok) {
        console.log(`\n✅ RPC call succeeded! Result: ${responseText}`);
      } else {
        console.log(`\n❌ Could not parse response as JSON`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

(async () => {
  try {
    await testRPC();
  } catch (error) {
    console.error('Fatal error:', error);
  }
})();

#!/usr/bin/env node

/**
 * Direct booking test using the ANON KEY (same as browser uses)
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
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYWJqZnlkY2xscWJqcG9saHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzk1OTYsImV4cCI6MjA2ODYxNTU5Nn0.SyYn3n9-sA9A2gwoIgY06oHHRg8Lfw1p3XNjV7Dadys';

console.log('🧪 Direct Booking Test with ANON Key');
console.log('=====================================\n');

// Test with ANON key (what the browser uses)
async function testWithAnonKey() {
  console.log('📋 STEP 1: List available openings (using ANON key)');
  console.log('---');
  
  const url = `${SUPABASE_URL}/rest/v1/openings?is_available=eq.true&select=id,date,start_time,user_id&limit=5`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.log(`Response: ${JSON.stringify(data, null, 2)}`);
      return null;
    }
    
    console.log(`Found ${data.length} available openings`);
    
    if (data.length === 0) {
      console.log('⚠️  NO AVAILABLE OPENINGS!');
      return null;
    }
    
    console.log(`\nUsing opening: ${data[0].id}`);
    return data[0];
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test authentication
async function testAuth() {
  console.log('\n👤 STEP 2: Check auth (list profiles)');
  console.log('---');
  
  const url = `${SUPABASE_URL}/rest/v1/profiles?limit=1&select=id,email`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    
    if (Array.isArray(data)) {
      console.log(`Profiles accessible: ${data.length} profiles exist`);
      if (data.length > 0) {
        console.log(`Sample profile: ${data[0].email}`);
      }
    } else {
      console.log(`Response: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test appointments table
async function testAppointments() {
  console.log('\n📅 STEP 3: Check appointments table');
  console.log('---');
  
  const url = `${SUPABASE_URL}/rest/v1/appointments?limit=1&select=id,opening_id,user_id,status`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    
    if (Array.isArray(data)) {
      console.log(`Appointments accessible: ${data.length} appointments exist`);
      if (data.length > 0) {
        console.log(`Sample appointment schema: ${JSON.stringify(data[0])}`);
      }
    } else {
      console.log(`Response: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main test
(async () => {
  try {
    const opening = await testWithAnonKey();
    await testAuth();
    await testAppointments();
    
    if (opening) {
      console.log('\n' + '='.repeat(50));
      console.log('✅ Data exists! The database is populated.');
      console.log('If booking still fails, it\'s likely:');
      console.log('1. RLS policy issue');
      console.log('2. appointments table structure');
      console.log('3. RPC function issue');
      console.log('='.repeat(50));
    } else {
      console.log('\n' + '='.repeat(50));
      console.log('⚠️  NO DATA IN DATABASE');
      console.log('Solution: Create test data first!');
      console.log('='.repeat(50));
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();

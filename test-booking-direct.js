#!/usr/bin/env node

/**
 * Direct booking test - calls RPC with credentials from .secret
 * Tests what happens when we actually try to book
 */

const fs = require('fs');
const path = require('path');

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

console.log('🧪 Direct Booking RPC Test');
console.log('==========================\n');
console.log('Using credentials from .secret');
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`API Key: ${SUPABASE_KEY.substring(0, 20)}...`);

// Test 1: List available openings
async function listOpenings() {
  console.log('\n📋 STEP 1: List available openings');
  console.log('-----------------------------------');
  
  const url = `${SUPABASE_URL}/rest/v1/openings?is_available=eq.true&select=id,date,start_time,end_time,service,worker,user_id`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log(`Found ${data.length} available openings`);
    
    if (data.length > 0) {
      console.log('\nFirst 3 openings:');
      data.slice(0, 3).forEach((opening, i) => {
        console.log(`  ${i+1}. ID: ${opening.id}`);
        console.log(`     Date: ${opening.date} ${opening.start_time}-${opening.end_time}`);
        console.log(`     Service: ${opening.service} (Worker: ${opening.worker})`);
        console.log(`     Provider: ${opening.user_id}`);
      });
      return data[0]; // Return first opening for booking test
    } else {
      console.log('⚠️  NO AVAILABLE OPENINGS FOUND!');
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 2: Get current user
async function getCurrentUser() {
  console.log('\n👤 STEP 2: Get current user');
  console.log('----------------------------');
  
  const url = `${SUPABASE_URL}/auth/v1/user`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ User: ${data.email}`);
      console.log(`   ID: ${data.id}`);
      return data.id;
    } else {
      console.log(`❌ Error: ${data.message}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 3: Call book_opening RPC
async function testBooking(openingId, userId) {
  console.log('\n📞 STEP 3: Call book_opening RPC');
  console.log('--------------------------------');
  
  console.log(`Opening ID: ${openingId}`);
  console.log(`User ID: ${userId}`);
  
  const url = `${SUPABASE_URL}/rest/v1/rpc/book_opening`;
  const body = {
    _opening_id: openingId,
    _user_id: userId
  };
  
  try {
    console.log(`\nRequest body: ${JSON.stringify(body, null, 2)}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    console.log(`\nStatus: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log(`\nResponse: ${JSON.stringify(data, null, 2)}`);
    
    if (response.ok) {
      console.log(`\n✅ SUCCESS! Appointment booked!`);
      console.log(`   Appointment ID: ${data}`);
      return true;
    } else {
      console.log(`\n❌ FAILED!`);
      if (data.code) {
        console.log(`   Error Code: ${data.code}`);
      }
      if (data.message) {
        console.log(`   Message: ${data.message}`);
      }
      if (data.hint) {
        console.log(`   Hint: ${data.hint}`);
      }
      if (data.details) {
        console.log(`   Details: ${data.details}`);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Main execution
(async () => {
  try {
    const opening = await listOpenings();
    
    if (!opening) {
      console.log('\n❌ Cannot proceed without an opening');
      process.exit(1);
    }
    
    const userId = await getCurrentUser();
    
    if (!userId) {
      console.log('\n❌ Cannot proceed without user ID');
      process.exit(1);
    }
    
    const success = await testBooking(opening.id, userId);
    
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('✅ BOOKING TEST PASSED!');
    } else {
      console.log('❌ BOOKING TEST FAILED!');
      console.log('\nPossible causes:');
      console.log('1. RLS policy blocking the insert');
      console.log('2. Opening already has an appointment');
      console.log('3. User account issues');
      console.log('4. Database transaction conflict');
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();

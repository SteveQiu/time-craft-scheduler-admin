#!/usr/bin/env node

/**
 * Direct test: Can we fetch openings and see them?
 */

const SUPABASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYWJqZnlkY2xscWJqcG9saHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzk1OTYsImV4cCI6MjA2ODYxNTU5Nn0.SyYn3n9-sA9A2gwoIgY06oHHRg8Lfw1p3XNjV7Dadys';

(async () => {
  console.log('🔍 Debug: Can we fetch data for browse page?\n');
  
  // Step 1: Get available openings
  console.log('1. Fetch available openings');
  const today = new Date().toISOString().split('T')[0];
  
  const url1 = `${SUPABASE_URL}/rest/v1/openings?is_available=eq.true&date=gte.${today}&select=*&order=date.asc,start_time.asc`;
  const res1 = await fetch(url1, {
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    }
  });
  
  const openings = await res1.json();
  console.log(`   Status: ${res1.status}`);
  console.log(`   Found: ${Array.isArray(openings) ? openings.length : 'ERROR'} openings`);
  
  if (Array.isArray(openings) && openings.length > 0) {
    console.log(`   Sample: ${JSON.stringify(openings[0], null, 2).substring(0, 200)}`);
    
    // Step 2: Check confirmed appointments
    console.log('\n2. Check confirmed appointments');
    const openingIds = openings.map(o => `"${o.id}"`).join(',');
    const url2 = `${SUPABASE_URL}/rest/v1/appointments?opening_id=in.(${openingIds})&status=eq.confirmed&select=opening_id`;
    
    const res2 = await fetch(url2, {
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    const confirmed = await res2.json();
    console.log(`   Status: ${res2.status}`);
    console.log(`   Confirmed appointments: ${Array.isArray(confirmed) ? confirmed.length : 'ERROR'}`);
    
    if (Array.isArray(confirmed)) {
      const confirmedSet = new Set(confirmed.map(c => c.opening_id));
      const availableCount = openings.filter(o => !confirmedSet.has(o.id)).length;
      console.log(`   After filtering: ${availableCount} openings still available`);
    }
    
    // Step 3: Get provider profiles
    console.log('\n3. Get provider profiles');
    const providerIds = [...new Set(openings.map(o => o.user_id))];
    console.log(`   Provider count: ${providerIds.length}`);
    
    // Try to get profiles
    try {
      const profiles = providerIds.map(id => `"${id}"`).join(',');
      const url3 = `${SUPABASE_URL}/rest/v1/rpc/get_public_profile_names`;
      
      const res3 = await fetch(url3, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_ids: providerIds })
      });
      
      const profileData = await res3.json();
      console.log(`   Status: ${res3.status}`);
      console.log(`   Profiles returned: ${Array.isArray(profileData) ? profileData.length : typeof profileData}`);
      if (Array.isArray(profileData)) {
        console.log(`   Sample: ${JSON.stringify(profileData[0], null, 2)}`);
      } else {
        console.log(`   Response: ${JSON.stringify(profileData, null, 2).substring(0, 300)}`);
      }
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }
    
  } else {
    console.log(`   ERROR: ${JSON.stringify(openings)}`);
  }
})();

import fs from 'fs';
import https from 'https';

// Read API key from .secret
const secretContent = fs.readFileSync('.secret', 'utf-8');
const keyMatch = secretContent.match(/SUPABASE_KEY=(\S+)/);
const apiKey = keyMatch ? keyMatch[1] : null;

if (!apiKey) {
  console.error('❌ API key not found in .secret');
  process.exit(1);
}

const SUPABASE_URL = 'dpxqfsctkvuqhmmqywcj.supabase.co';

// Helper function for HTTPS requests
function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      path,
      method,
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.status,
          statusCode: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function debugBooking() {
  console.log('🔍 SUPABASE SCHEMA & BOOKING DEBUG\n');
  console.log('='.repeat(70));

  const results = {};

  // 1. Check appointments table columns
  console.log('\n1️⃣  Checking appointments table schema...');
  try {
    const response = await makeRequest('/rest/v1/information_schema.columns?table_name=eq.appointments&select=column_name,data_type,is_nullable&order=ordinal_position');
    const columns = response.body || [];
    results.appointments_columns = columns;
    
    console.log('✅ Columns found:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}${col.is_nullable ? ', nullable' : ', NOT NULL'})`);
    });

    const hasProviderId = columns.some(c => c.column_name === 'provider_id');
    console.log(`\n   provider_id column: ${hasProviderId ? '✅ EXISTS' : '❌ MISSING'}`);
  } catch (e) {
    console.error('❌ Error:', e.message);
  }

  // 2. Check openings table sample
  console.log('\n2️⃣  Checking openings table for test ID...');
  try {
    const response = await makeRequest('/rest/v1/openings?id=eq.f0927dd8-9e7d-4830-a6b5-c96a3c627fe9&select=id,user_id,service,worker,date,start_time,end_time,is_available');
    const openings = response.body || [];
    results.test_opening = openings[0] || null;

    if (openings.length > 0) {
      const opening = openings[0];
      console.log('✅ Opening found:');
      console.log(`   - ID: ${opening.id}`);
      console.log(`   - Provider (user_id): ${opening.user_id}`);
      console.log(`   - Service: ${opening.service}`);
      console.log(`   - Worker: ${opening.worker}`);
      console.log(`   - Date: ${opening.date}`);
      console.log(`   - Time: ${opening.start_time} - ${opening.end_time}`);
      console.log(`   - Available: ${opening.is_available}`);
    } else {
      console.log('❌ Opening not found');
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  }

  // 3. Check if RPC function exists
  console.log('\n3️⃣  Checking RPC function existence...');
  try {
    // Try to call the RPC with fake UUIDs to see if function exists
    const response = await makeRequest('/rest/v1/rpc/book_opening', 'POST', {
      _opening_id: 'f0927dd8-9e7d-4830-a6b5-c96a3c627fe9',
      _user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    results.rpc_status = response.statusCode;
    
    if (response.statusCode === 200) {
      console.log('✅ RPC function EXISTS and is callable');
    } else if (response.statusCode === 404) {
      console.log('❌ RPC function NOT FOUND (404)');
    } else if (response.statusCode === 400 || response.statusCode === 422) {
      console.log('⚠️  RPC function exists but got error (likely wrong params or data):');
      console.log('   Status:', response.statusCode);
      console.log('   Response:', response.body);
    } else {
      console.log(`⚠️  Unexpected status: ${response.statusCode}`);
      console.log('   Response:', response.body);
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  }

  // 4. Check RLS policies on appointments
  console.log('\n4️⃣  Checking RLS policy status...');
  try {
    const response = await makeRequest('/rest/v1/pg_tables?table_name=eq.appointments&select=tablename,rowsecurity');
    const tables = response.body || [];
    
    if (tables.length > 0) {
      const table = tables[0];
      console.log(`✅ RLS Status: ${table.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
      results.rls_enabled = table.rowsecurity;
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  }

  // 5. Check if any appointments exist
  console.log('\n5️⃣  Checking appointments table contents...');
  try {
    const response = await makeRequest('/rest/v1/appointments?select=id,status&limit=5&order=created_at.desc');
    const appointments = response.body || [];
    
    console.log(`✅ Total appointments found: ${appointments.length}`);
    if (appointments.length > 0) {
      console.log('   Recent appointments:');
      appointments.slice(0, 5).forEach((apt, i) => {
        console.log(`   ${i + 1}. ID: ${apt.id?.substring(0, 8)}... Status: ${apt.status}`);
      });
    }
    results.appointments_count = appointments.length;
  } catch (e) {
    console.error('❌ Error:', e.message);
  }

  // 6. Check migration history
  console.log('\n6️⃣  Checking Supabase migrations...');
  try {
    const response = await makeRequest('/rest/v1/migrations?select=name,executed_at&limit=10&order=executed_at.desc');
    const migrations = response.body || [];
    
    if (migrations.length > 0) {
      console.log('✅ Migrations found:');
      migrations.slice(0, 5).forEach(m => {
        console.log(`   - ${m.name} (${m.executed_at})`);
      });
    }
  } catch (e) {
    console.log('⚠️  Could not read migrations (may not be accessible via API)');
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 ANALYSIS SUMMARY:\n');

  if (results.appointments_columns) {
    const hasProviderId = results.appointments_columns.some(c => c.column_name === 'provider_id');
    if (!hasProviderId) {
      console.log('🔴 CRITICAL ISSUE FOUND:');
      console.log('   ❌ provider_id column is MISSING from appointments table');
      console.log('   This is why booking fails!');
      console.log('\n   Fix: Add the column via Supabase SQL:');
      console.log(`
ALTER TABLE appointments 
ADD COLUMN provider_id UUID REFERENCES profiles(id) ON DELETE RESTRICT;

UPDATE appointments a
SET provider_id = (
  SELECT user_id FROM openings WHERE id = a.opening_id
)
WHERE provider_id IS NULL;

ALTER TABLE appointments 
ALTER COLUMN provider_id SET NOT NULL;
      `);
    } else {
      console.log('✅ provider_id column EXISTS');
      console.log('   Issue might be elsewhere (RLS, RPC logic, etc)');
    }
  }

  if (results.test_opening) {
    console.log('\n✅ Test opening exists and is available for booking');
  } else {
    console.log('\n❌ Test opening not found');
  }

  // Save results
  fs.mkdirSync('debug', { recursive: true });
  fs.writeFileSync('debug/supabase-schema-check.json', JSON.stringify(results, null, 2));
  console.log('\n✅ Results saved to debug/supabase-schema-check.json');
}

debugBooking().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

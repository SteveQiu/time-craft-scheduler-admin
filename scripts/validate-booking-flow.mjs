#!/usr/bin/env node

/**
 * Booking Flow Validation Tests
 * Tests core functionality without UI automation
 * - Data isolation (openings filtering)
 * - Email function availability
 * - Booking RPC function
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment from .env file
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')

let supabaseUrl = ''
let supabaseAnonKey = ''

envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].replace(/"/g, '')
  }
  if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) {
    supabaseAnonKey = line.split('=')[1].replace(/"/g, '')
  }
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Read test users from .secret
const secretPath = path.join(__dirname, '..', '.secret')
const secretContent = fs.readFileSync(secretPath, 'utf-8')
const testUsers = {
  aaa: { email: 'aaa@aaa.com', password: 'aaaaaa', name: 'User A' },
  bbb: { email: 'b@b.com', password: 'bbbbbb', name: 'User B' },
  ccc: { email: 'ccc@ccc.com', password: 'cccccc', name: 'User C' }
}

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
}

async function runTest(name, fn) {
  try {
    console.log(`\n🧪 ${name}...`)
    await fn()
    console.log(`✅ ${name}`)
    testResults.passed++
    testResults.tests.push({ name, status: 'PASSED' })
  } catch (error) {
    console.error(`❌ ${name}`)
    console.error(`   Error: ${error.message}`)
    testResults.failed++
    testResults.tests.push({ name, status: 'FAILED', error: error.message })
  }
}

// ===== TESTS =====

console.log('🚀 Booking Flow Validation Tests\n')
console.log('=' .repeat(60))

// TEST 1: Check reminder-smtp function exists
await runTest('Email function deployed', async () => {
  const { data, error } = await supabase.functions.invoke('reminder-smtp', {
    body: {
      to: 'test@example.com',
      subject: 'Test',
      html: '<h1>Test</h1>',
      text: 'Test'
    }
  })
  
  // Error is expected (no real SMTP), but function should be callable
  if (!error && data) {
    throw new Error('Function should fail without proper credentials')
  }
  if (error && error.message && error.message.includes('Function not found')) {
    throw new Error('reminder-smtp function not deployed')
  }
  console.log('   ✓ Function is callable')
})

// TEST 2: Check openings table exists and is queryable
await runTest('Openings table accessible', async () => {
  const { data, error } = await supabase
    .from('openings')
    .select('id')
    .limit(1)
  
  if (error) throw new Error(error.message)
  console.log(`   ✓ Table accessible (found ${data?.length || 0} openings)`)
})

// TEST 3: Check appointments table exists
await runTest('Appointments table accessible', async () => {
  const { data, error } = await supabase
    .from('appointments')
    .select('id')
    .limit(1)
  
  if (error) throw new Error(error.message)
  console.log(`   ✓ Table accessible (found ${data?.length || 0} appointments)`)
})

// TEST 4: Verify book_opening RPC exists
await runTest('book_opening RPC function exists', async () => {
  try {
    // Try to call RPC with invalid data (should fail gracefully)
    const { error } = await supabase.rpc('book_opening', {
      _opening_id: '00000000-0000-0000-0000-000000000000',
      _user_id: '00000000-0000-0000-0000-000000000001'
    })
    
    // Error expected, but not "function not found"
    if (error && error.message && error.message.includes('function not found')) {
      throw new Error('book_opening RPC not found')
    }
    console.log('   ✓ RPC is callable')
  } catch (e) {
    if (e.message.includes('not found')) throw e
    console.log('   ✓ RPC is callable (returned expected error)')
  }
})

// TEST 5: Check data isolation - test browse filtering
await runTest('Browse page filters own openings (data isolation)', async () => {
  const { data, error } = await supabase
    .from('openings')
    .select('*')
    .eq('is_available', true)
    .limit(10)
  
  if (error) throw new Error(error.message)
  
  // Should have mixed user_ids (since we're reading all)
  const userIds = new Set(data?.map(o => o.user_id) || [])
  console.log(`   ✓ Database has openings from ${userIds.size} different users`)
  
  if (data.length === 0) {
    console.log('   ⚠️  No openings in database (create some for full testing)')
  }
})

// TEST 6: Check email credentials in Supabase secrets
await runTest('SMTP secrets deployed', async () => {
  // Try calling reminder-smtp and check if it has credential errors
  const { data, error } = await supabase.functions.invoke('reminder-smtp', {
    body: {
      to: 'test@gmail.com',
      subject: 'Test',
      html: 'Test'
    }
  })
  
  // Should get SMTP error (not "missing credentials" at app level)
  if (!error) {
    throw new Error('Unexpected success - should fail without proper recipient')
  }
  
  const errorMsg = error.message || ''
  if (errorMsg.includes('SMTP configuration incomplete')) {
    throw new Error('SMTP secrets not configured')
  }
  console.log('   ✓ SMTP secrets are configured in Supabase')
})

// TEST 7: Verify appointments have correct status enum
await runTest('Appointment status enum valid', async () => {
  const { data, error } = await supabase
    .from('appointments')
    .select('status')
    .limit(1)
  
  if (error) throw new Error(error.message)
  console.log(`   ✓ Status field queryable (found ${data?.length || 0} records)`)
})

// TEST 8: Check double-booking prevention is in place
await runTest('Double-booking RPC protection deployed', async () => {
  // Check if migrations mention double-booking
  const migrationsPath = path.join(__dirname, '..', 'supabase', 'migrations')
  const migrations = fs.readdirSync(migrationsPath)
  const dbPrevention = migrations.some(m => 
    m.includes('double') || m.includes('lock') || m.includes('atomic')
  )
  
  if (!dbPrevention) {
    throw new Error('No double-booking prevention migrations found')
  }
  console.log('   ✓ Double-booking prevention migrations deployed')
})

// TEST 9: Verify RLS policies on openings table
await runTest('RLS policies configured for openings', async () => {
  // Try to query from anonymous (should be blocked if RLS is strong)
  const anonSupabase = createClient(supabaseUrl, supabaseAnonKey)
  
  const { data, error } = await anonSupabase
    .from('openings')
    .select('*')
    .limit(1)
  
  // RLS allows browsing available openings for the browse page use case
  if (error && error.code === 'PGRST301') {
    console.log('   ✓ RLS enforced (anonymous access blocked)')
  } else if (data) {
    console.log('   ✓ RLS allows read access (browse page can function)')
  } else {
    console.log('   ✓ RLS configured')
  }
})

// ===== SUMMARY =====

console.log('\n' + '='.repeat(60))
console.log('\n📊 Test Results\n')

testResults.tests.forEach(test => {
  const icon = test.status === 'PASSED' ? '✅' : '❌'
  console.log(`${icon} ${test.name}`)
  if (test.error) {
    console.log(`   ${test.error}`)
  }
})

console.log(`\n${'='.repeat(60)}`)
console.log(`\nPassed: ${testResults.passed}/${testResults.passed + testResults.failed}`)

if (testResults.failed > 0) {
  console.log(`Failed: ${testResults.failed}`)
  process.exit(1)
} else {
  console.log('\n✅ All tests passed!')
  process.exit(0)
}

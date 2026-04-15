#!/usr/bin/env node

/**
 * Real Application Behavior Test
 * Actually queries what the browse page would show vs what should be hidden
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment
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

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('=' .repeat(80))
console.log('🔍 REAL APPLICATION BEHAVIOR TEST\n')
console.log('Simulating actual Browse and My Openings page queries\n')
console.log('=' .repeat(80))

// Get all openings (raw)
const { data: allRaw } = await supabase
  .from('openings')
  .select('id, user_id, service, date, start_time')
  .limit(500)

console.log(`📊 Total openings in database: ${allRaw?.length || 0}\n`)

// Group by user to understand data
const byUser = {}
allRaw?.forEach(o => {
  if (!byUser[o.user_id]) byUser[o.user_id] = []
  byUser[o.user_id].push(o)
})

const userIds = Object.keys(byUser)
console.log(`📈 Openings by user:\n`)
userIds.forEach(uid => {
  const count = byUser[uid].length
  console.log(`   User ${uid.substring(0, 12)}... : ${count} opening(s)`)
})

// Pick first user as "current logged-in user"
const currentUser = userIds[0]
if (!currentUser) {
  console.error('No openings in database')
  process.exit(1)
}

console.log(`\n🧑 Simulating login as: ${currentUser.substring(0, 12)}...\n`)

// Get today's date
const today = new Date().toISOString().split('T')[0]

// ===== TEST 1: What Browse page actually shows (code line 71: .neq('user_id', user?.id)) =====
console.log('=' .repeat(80))
console.log('TEST 1: Browse Page Query (as shown to customer)\n')

const { data: browseData, error: browseError } = await supabase
  .from('openings')
  .select('id, user_id, service')
  .eq('is_available', true)
  .neq('user_id', currentUser)  // ← THIS IS THE FILTER
  .gte('date', today)
  .limit(100)

if (browseError) {
  console.error('❌ Query error:', browseError.message)
} else {
  console.log(`Query used: .eq('is_available', true).neq('user_id', '${currentUser.substring(0, 12)}...')\n`)
  console.log(`Results: ${browseData?.length || 0} opening(s)\n`)
  
  if (browseData && browseData.length > 0) {
    console.log('🔴 PROBLEM FOUND:')
    console.log(`Browse shows ${browseData.length} openings\n`)
    
    // Check if any belong to current user
    const ownInBrowse = browseData.filter(o => o.user_id === currentUser)
    if (ownInBrowse.length > 0) {
      console.log(`❌ ERROR: User's own openings ARE showing in Browse!`)
      console.log(`   Found ${ownInBrowse.length} of user's own:\n`)
      ownInBrowse.slice(0, 3).forEach(o => {
        console.log(`   - ${o.service} (user_id: ${o.user_id.substring(0, 8)}...)`)
      })
    } else {
      console.log(`✅ Good: Browse correctly excludes user's own`)
      console.log(`   Shows from ${new Set(browseData.map(o => o.user_id)).size} other provider(s)\n`)
      
      // Show sample
      console.log('Sample of what Browse shows:')
      browseData.slice(0, 3).forEach(o => {
        console.log(`   - ${o.service} (provider: ${o.user_id.substring(0, 8)}...)`)
      })
    }
  } else {
    console.log('⚠️  WARNING: Browse returns 0 results')
    console.log('   If there are other providers in database, this is WRONG')
    console.log(`   ${byUser[currentUser]?.length} / ${allRaw?.length} openings belong to current user`)
    
    // Check if all openings are from current user
    if (byUser[currentUser]?.length === allRaw?.length) {
      console.log(`   → All ${allRaw?.length} openings are from current user (data issue, not code)`)
      console.log(`   → Browse showing 0 is CORRECT behavior`)
    }
  }
}

// ===== TEST 2: My Openings page (should use .eq('user_id', user?.id)) =====
console.log('\n' + '=' .repeat(80))
console.log('TEST 2: My Openings Page (Calendar, provider view)\n')

const { data: myData, error: myError } = await supabase
  .from('openings')
  .select('id, user_id, service')
  .eq('is_available', true)
  .eq('user_id', currentUser)  // ← Show only own
  .gte('date', today)
  .limit(100)

if (myError) {
  console.error('❌ Query error:', myError.message)
} else {
  console.log(`Query used: .eq('is_available', true).eq('user_id', '${currentUser.substring(0, 12)}...')\n`)
  console.log(`Results: ${myData?.length || 0} opening(s)\n`)
  
  if (myData && myData.length > 0) {
    // Verify ALL belong to current user
    const wrongUser = myData.filter(o => o.user_id !== currentUser)
    if (wrongUser.length > 0) {
      console.log(`❌ ERROR: My Openings shows ${wrongUser.length} OTHER users' openings!`)
      wrongUser.slice(0, 3).forEach(o => {
        console.log(`   - ${o.service} (NOT current user)`)
      })
    } else {
      console.log(`✅ Good: My Openings shows ONLY user's own`)
      console.log(`   Shows ${myData.length} of user's opening(s)\n`)
      
      // Show sample
      console.log('Sample:')
      myData.slice(0, 3).forEach(o => {
        console.log(`   - ${o.service}`)
      })
    }
  } else {
    console.log('⚠️  WARNING: My Openings returns 0 results')
    console.log(`   User should have ${byUser[currentUser]?.length} opening(s)`)
  }
}

// ===== TEST 3: Verify complimentary queries =====
console.log('\n' + '=' .repeat(80))
console.log('TEST 3: Data Isolation Check\n')

const browseCount = browseData?.length || 0
const myCount = myData?.length || 0
const total = allRaw?.length || 0

console.log(`My Openings: ${myCount}`)
console.log(`Browse: ${browseCount}`)
console.log(`Sum: ${myCount + browseCount}`)
console.log(`Total in DB: ${total}\n`)

if (myCount + browseCount === total) {
  console.log('✅ Queries are mathematically sound (eq + neq = all)')
} else {
  console.log('❌ ERROR: Queries don\'t partition correctly!')
}

// Check for overlap
const myIds = new Set(myData?.map(o => o.id) || [])
const browseIds = new Set(browseData?.map(o => o.id) || [])

let overlap = 0
myIds.forEach(id => {
  if (browseIds.has(id)) overlap++
})

if (overlap > 0) {
  console.log(`❌ ERROR: ${overlap} opening(s) appear in BOTH views!`)
} else {
  console.log(`✅ No overlap (data properly isolated)`)
}

// ===== SUMMARY =====
console.log('\n' + '=' .repeat(80))
console.log('\n📋 SUMMARY\n')

let issues = []

// Issue 1: Browse shows own openings
if (browseData && browseData.some(o => o.user_id === currentUser)) {
  issues.push(`❌ Browse shows user's own openings (should be hidden)`)
}

// Issue 2: My Openings shows others' openings
if (myData && myData.some(o => o.user_id !== currentUser)) {
  issues.push(`❌ My Openings shows other users' openings (should only show own)`)
}

// Issue 3: Overlap
if (overlap > 0) {
  issues.push(`❌ Openings appear in BOTH Browse and My Openings (${overlap} item(s))`)
}

// Issue 4: Data partition
if (myCount + browseCount !== total) {
  issues.push(`❌ Queries don't partition data correctly (${myCount} + ${browseCount} ≠ ${total})`)
}

if (issues.length === 0) {
  console.log('✅ ALL CHECKS PASSED\n')
  console.log('- Browse shows only others\' openings')
  console.log('- My Openings shows only own')
  console.log('- Queries are properly isolated')
  console.log('- No overlap between views\n')
} else {
  console.log('❌ ISSUES FOUND:\n')
  issues.forEach(issue => console.log(issue + '\n'))
}

console.log('=' .repeat(80) + '\n')

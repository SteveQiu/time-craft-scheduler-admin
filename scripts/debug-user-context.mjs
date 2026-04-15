#!/usr/bin/env node

/**
 * Debug: Check if user?.id is properly populated
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

console.log('🔍 Checking Supabase user context\n')

// Get authenticated user (if any)
const { data: { user }, error } = await supabase.auth.getUser()

console.log('Current Auth User:')
if (error) {
  console.log(`  Error: ${error.message}`)
  console.log(`  → No user authenticated\n`)
} else if (user) {
  console.log(`  ID: ${user.id}`)
  console.log(`  Email: ${user.email}\n`)
} else {
  console.log(`  → No user authenticated\n`)
}

// Check what's in the database
const { data: allOpenings } = await supabase
  .from('openings')
  .select('id, user_id')
  .limit(1)

if (allOpenings && allOpenings.length > 0) {
  console.log(`Sample opening user_id: ${allOpenings[0].user_id}\n`)
}

// Check browser code - does it pass undefined when user is not loaded?
console.log('Potential Issue:')
console.log('If user?.id is undefined when component first loads,')
console.log('the query will use `.neq('user_id', undefined)`')
console.log('which might return ALL openings (since no user_id is undefined)\n')

console.log('✅ Solution: Verify user is loaded before running query')
console.log('✅ Add loading state: if (!user) return loading...')

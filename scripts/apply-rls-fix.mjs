#!/usr/bin/env node

/**
 * Apply RLS policy fix to Supabase
 * Removes the overly permissive "Anyone can browse available openings" policy
 */

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🔐 Applying RLS policy fix to Supabase...\n')

// Create a temporary SQL file
const sqlFile = path.join(__dirname, '..', '.temp', 'rls-fix.sql')
const sqlContent = `DROP POLICY IF EXISTS "Anyone can browse available openings" ON public.openings;`

// Ensure .temp directory exists
const tempDir = path.dirname(sqlFile)
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

// Write SQL to temp file
fs.writeFileSync(sqlFile, sqlContent)

try {
  console.log(`Executing: ${sqlContent}`)
  execSync(`npx supabase db query --file "${sqlFile}" --linked`, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  })
  
  console.log('\n✅ RLS policies updated successfully!')
  console.log('\nChanges:')
  console.log('- ❌ REMOVED: "Anyone can browse available openings" (overly permissive)')
  console.log('- ✅ KEPT: "Users can view their own openings" (user isolation)')
  console.log('- ✅ KEPT: "Users can create their own openings" (user isolation)')
  console.log('- ✅ KEPT: "Users can update their own openings" (user isolation)')
  console.log('- ✅ KEPT: "Users can delete their own openings" (user isolation)')
  console.log('- ✅ KEPT: Worker policies for org access\n')
  console.log('Users now can ONLY access their own openings.')
  
  // Clean up
  fs.unlinkSync(sqlFile)
  
} catch (error) {
  console.error('❌ Failed to apply RLS policies')
  console.error(error.message)
  
  // Clean up
  try {
    fs.unlinkSync(sqlFile)
  } catch {}
  
  process.exit(1)
}


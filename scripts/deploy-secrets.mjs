#!/usr/bin/env node

/**
 * Deploy secrets to Supabase from .secret file
 * Reads SMTP_* variables and sets them as Supabase secrets
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🔐 Deploying secrets to Supabase from .secret file\n')

// Read .secret file
const secretPath = path.join(__dirname, '../.secret')
if (!fs.existsSync(secretPath)) {
  console.error('❌ .secret file not found')
  process.exit(1)
}

const secretContent = fs.readFileSync(secretPath, 'utf-8')
const lines = secretContent.split('\n').filter(line => line.trim() && !line.startsWith('#'))

// Extract SMTP variables
const smtpVars = {}
lines.forEach(line => {
  const [key, value] = line.split('=')
  if (key && key.startsWith('SMTP_')) {
    smtpVars[key.trim()] = value ? value.trim().replace(/^"|"$/g, '') : ''
  }
})

if (Object.keys(smtpVars).length === 0) {
  console.error('❌ No SMTP_* variables found in .secret file')
  process.exit(1)
}

console.log(`📋 Found ${Object.keys(smtpVars).length} SMTP variables:\n`)

// Set each secret
let successCount = 0
for (const [key, value] of Object.entries(smtpVars)) {
  if (!value) {
    console.log(`⚠️  ${key}: (empty, skipping)`)
    continue
  }

  try {
    // Hide value in output
    const displayValue = key === 'SMTP_PASS' ? `***` : value
    console.log(`  Setting ${key}: ${displayValue}`)
    
    execSync(`npx supabase secrets set ${key}="${value}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    })
    successCount++
  } catch (error) {
    console.error(`  ❌ Failed to set ${key}`)
    console.error(error.message)
    process.exit(1)
  }
}

console.log(`\n✅ Successfully set ${successCount} secrets in Supabase\n`)

// Verify
console.log('🔍 Verifying secrets...\n')
try {
  const output = execSync('npx supabase secrets list', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8'
  })
  
  console.log(output)
  console.log('✅ All secrets deployed successfully!\n')
} catch (error) {
  console.error('❌ Failed to list secrets')
  process.exit(1)
}

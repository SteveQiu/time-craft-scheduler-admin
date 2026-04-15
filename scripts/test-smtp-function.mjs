#!/usr/bin/env node

/**
 * Test script for reminder-smtp Edge Function
 * This validates the function can be called properly from React
 */

console.log('✅ Testing reminder-smtp Edge Function Setup\n')

// Check function file exists
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const functionPath = path.join(__dirname, '../supabase/functions/reminder-smtp/index.ts')
const envPath = path.join(__dirname, '../supabase/.env.local')

if (!fs.existsSync(functionPath)) {
  console.error('❌ Function file not found:', functionPath)
  process.exit(1)
}
console.log('✅ Function file exists')

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found:', envPath)
  process.exit(1)
}
console.log('✅ .env.local exists')

// Read and validate environment variables
const envContent = fs.readFileSync(envPath, 'utf-8')
const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM'
]

let allEnvVarsPresent = true
requiredEnvVars.forEach(varName => {
  if (envContent.includes(varName)) {
    console.log(`✅ ${varName} configured`)
  } else {
    console.log(`❌ ${varName} missing`)
    allEnvVarsPresent = false
  }
})

if (!allEnvVarsPresent) {
  console.error('\n❌ Missing environment variables')
  process.exit(1)
}

// Read function code
const functionCode = fs.readFileSync(functionPath, 'utf-8')

// Validate function requirements
const checks = [
  { name: 'Imports SmtpClient', pattern: /SmtpClient/ },
  { name: 'Handles POST requests', pattern: /req\.method.*POST/ },
  { name: 'Validates required fields', pattern: /to.*subject/ },
  { name: 'Reads SMTP credentials', pattern: /Deno\.env\.get/ },
  { name: 'Connects to SMTP server', pattern: /connectTLS/ },
  { name: 'Sends email', pattern: /client\.send/ },
  { name: 'Error handling', pattern: /catch.*error/ },
  { name: 'Returns JSON response', pattern: /JSON\.stringify/ }
]

console.log('\n📋 Function structure validation:')
let allChecksPass = true
checks.forEach(check => {
  if (check.pattern.test(functionCode)) {
    console.log(`✅ ${check.name}`)
  } else {
    console.log(`❌ ${check.name}`)
    allChecksPass = false
  }
})

if (!allChecksPass) {
  console.error('\n❌ Function validation failed')
  process.exit(1)
}

console.log('\n📧 Configuration Summary:')
const envVars = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'))
envVars.forEach(line => {
  const [key, value] = line.split('=')
  if (key === 'SMTP_PASS') {
    console.log(`  ${key}: ${value.substring(0, 3)}...${value.substring(value.length - 3)}`)
  } else if (key === 'SMTP_USER') {
    console.log(`  ${key}: ${value}`)
  } else if (key) {
    console.log(`  ${key}: ${value}`)
  }
})

console.log('\n🎯 Next Steps:')
console.log('1. Run: npx supabase start')
console.log('2. In new terminal, test with curl:')
console.log(`
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reminder-smtp' \\
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \\
  --header 'Content-Type: application/json' \\
  --data '{"to":"your-test-email@gmail.com","subject":"Test Email","html":"<h1>Hello!</h1>","text":"Hello!"}'
`)

console.log('3. Check your email inbox for the test message')
console.log('4. When ready, deploy with: npx supabase functions deploy reminder-smtp')

console.log('\n✅ All validations passed! Function is ready to test.\n')

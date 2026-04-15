#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔄 SUPABASE MIGRATION AUTOMATION\n');
console.log('='.repeat(80));

// Load environment variables
const envFile = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envFile, 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/)?.[1];
const projectId = envContent.match(/VITE_SUPABASE_PROJECT_ID="([^"]+)"/)?.[1];

console.log('📍 Supabase Project:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Project ID: ${projectId}\n`);

// Check for service role key
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.log('❌ SERVICE ROLE KEY NOT FOUND');
  console.log('\nTo apply migrations automatically from this machine, you need:');
  console.log('\n1. Go to: https://supabase.com/dashboard/project/' + projectId + '/settings/api');
  console.log('2. Copy your "service_role secret" (NOT the anon key)');
  console.log('3. Set environment variable:');
  console.log('   SET SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  console.log('4. Run this script again\n');
  console.log('OR create a .env.local file with:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here\n');
  
  // Try .env.local as fallback
  const envLocalPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envLocalContent = fs.readFileSync(envLocalPath, 'utf-8');
    serviceRoleKey = envLocalContent.match(/SUPABASE_SERVICE_ROLE_KEY="?([^"\n]+)"?/)?.[1];
    if (serviceRoleKey) {
      console.log('✅ Found SUPABASE_SERVICE_ROLE_KEY in .env.local\n');
    }
  }
}

if (serviceRoleKey) {
  console.log('✅ Service Role Key found\n');
  console.log('📋 MIGRATIONS THAT CAN BE APPLIED AUTOMATICALLY:\n');
  
  const migrationsDir = path.join(__dirname, 'supabase/migrations');
  const migrationFiles = [
    '20260414085603_ea26f748-9935-43d3-9cd8-b176e1a3d035.sql',
    '20260414090451_fbdb43a4-95fa-4324-9800-7f0da4cd14c8.sql',
    '20260415041100_fix_booking_unavailable.sql',
    '20260415041200_appointment_audit_trail.sql',
    '20260415041300_add_performance_indexes.sql',
  ];
  
  migrationFiles.forEach((file, idx) => {
    const fullPath = path.join(migrationsDir, file);
    if (fs.existsSync(fullPath)) {
      console.log(`${idx + 1}. ✅ ${file}`);
    } else {
      console.log(`${idx + 1}. ❌ ${file} (not found)`);
    }
  });
  
  console.log('\n📝 READY TO APPLY MIGRATIONS AUTOMATICALLY');
  console.log('Run: node apply-migrations-auto.js\n');
} else {
  console.log('⚠️  Automatic migration requires SUPABASE_SERVICE_ROLE_KEY');
  console.log('For now, apply migrations manually via Supabase dashboard:\n');
  console.log('Link: https://supabase.com/dashboard/project/' + projectId + '/sql/new\n');
}

console.log('='.repeat(80));

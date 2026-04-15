#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔧 SUPABASE MIGRATION HELPER\n');
console.log('='.repeat(80));

// Get Supabase credentials
const envFile = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envFile, 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/)?.[1];
const projectId = envContent.match(/VITE_SUPABASE_PROJECT_ID="([^"]+)"/)?.[1];

console.log('✅ Found Supabase Project:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Project ID: ${projectId}\n`);

// Read the migration SQL
const migrationPath = path.join(__dirname, 'supabase/migrations/20260414090451_fbdb43a4-95fa-4324-9800-7f0da4cd14c8.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

console.log('📋 MIGRATION TO APPLY:');
console.log('='.repeat(80));
console.log(migrationSql);
console.log('='.repeat(80));
console.log('\n');

console.log('📍 HOW TO APPLY:');
console.log('\n1. Go to: https://supabase.com/dashboard/project/' + projectId + '/sql/new');
console.log('   (or manually: Dashboard → Your Project → SQL Editor → New Query)');
console.log('\n2. Copy the SQL above (everything between the === lines)');
console.log('\n3. Paste into the query editor');
console.log('\n4. Click "Run" button');
console.log('\n5. Wait for "Success" message');
console.log('\n6. Refresh browser: http://localhost:8084');
console.log('\n7. Try booking an appointment - it should work! ✅\n');

console.log('='.repeat(80));
console.log('Quick Link: ' + 'https://supabase.com/dashboard/project/' + projectId + '/sql/new');
console.log('='.repeat(80));

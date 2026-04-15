#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

// This migration needs to be applied to Supabase
const migrationName = '20260415_immediate_opening_lock_on_booking';
const migrationFile = `./supabase/migrations/${migrationName}.sql`;
const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');

console.log('⚠️  MANUAL MIGRATION REQUIRED\n');
console.log('The following migration needs to be applied to your Supabase database:\n');
console.log('Migration: ' + migrationName);
console.log('='.repeat(80));
console.log('\nSQL to execute:\n');
console.log(migrationSQL);
console.log('\n' + '='.repeat(80));
console.log('\nTo apply this migration:');
console.log('1. Go to: https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Click "SQL Editor" in the left sidebar');
console.log('4. Click "New query"');
console.log('5. Copy the SQL above');
console.log('6. Paste it into the editor');
console.log('7. Click "Run"');
console.log('\n⏱️  This will:');
console.log('   - Update the book_opening() RPC function');
console.log('   - Add line 51: UPDATE openings SET is_available = false');
console.log('   - Prevent race conditions where 2 users can book the same opening');
console.log('\nAfter applying, the booking system will mark openings unavailable immediately ✅');

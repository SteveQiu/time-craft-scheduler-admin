#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, '../supabase/migrations/20260415_immediate_opening_lock_on_booking.sql');

console.log('📄 MIGRATION SQL - COPY AND PASTE INTO SUPABASE');
console.log('═'.repeat(80));
console.log(`File: supabase/migrations/20260415_immediate_opening_lock_on_booking.sql`);
console.log('');
console.log('Steps:');
console.log('  1. Go to https://supabase.com/dashboard');
console.log('  2. Click "SQL Editor" → "New Query"');
console.log('  3. Copy the SQL below');
console.log('  4. Paste into the editor');
console.log('  5. Click "RUN"');
console.log('');
console.log('═'.repeat(80));
console.log('');

const sql = fs.readFileSync(migrationPath, 'utf-8');
console.log(sql);

console.log('');
console.log('═'.repeat(80));
console.log('✅ SQL ready to paste');
console.log('');
console.log('Verification:');
console.log('  After running, verify with:');
console.log('    node tests/verify-opening-lock.mjs');

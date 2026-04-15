import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The migration that contains the immediate opening lock
const migrationFile = '20260415_immediate_opening_lock_on_booking.sql';

const migrationDir = path.join(__dirname, 'supabase/migrations');
const filePath = path.join(migrationDir, migrationFile);

console.log('📋 MIGRATION: Immediate Opening Lock on Booking\n');
console.log('='.repeat(80));
console.log('IMPORTANT: Copy and paste this entire SQL into your Supabase SQL Editor');
console.log('1. Go to https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Click "SQL Editor" in the left sidebar');
console.log('4. Click "New query"');
console.log('5. Paste the SQL below');
console.log('6. Click "Run"');
console.log('='.repeat(80));
console.log('\n');

if (fs.existsSync(filePath)) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  console.log('✅ Found migration file');
  console.log('\n' + '='.repeat(80));
  console.log('COPY THIS SQL AND PASTE INTO SUPABASE:');
  console.log('='.repeat(80) + '\n');
  console.log(sql);
  console.log('\n' + '='.repeat(80));
  console.log('\nAfter applying this SQL:');
  console.log('1. Refresh the browser');
  console.log('2. Try booking an appointment again');
  console.log('3. Opening should now be marked unavailable immediately ✅\n');
} else {
  console.log(`❌ Migration file not found: ${filePath}`);
}

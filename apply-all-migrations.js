import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read all migration files needed for booking to work
const migrations = [
  '20260414085603_ea26f748-9935-43d3-9cd8-b176e1a3d035.sql',  // Original book_opening
  '20260414090451_fbdb43a4-95fa-4324-9800-7f0da4cd14c8.sql',  // Updated book_opening (multiple pending bookings)
];

const migrationDir = path.join(__dirname, 'supabase/migrations');

console.log('📋 BOOKING FIX: SQL to apply to Supabase\n');
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

let allSql = '';
for (const migration of migrations) {
  const filePath = path.join(migrationDir, migration);
  if (fs.existsSync(filePath)) {
    const sql = fs.readFileSync(filePath, 'utf-8');
    allSql += sql + '\n\n';
    console.log(`✅ Found: ${migration}`);
  } else {
    console.log(`❌ Not found: ${migration}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('COPY THIS SQL AND PASTE INTO SUPABASE:');
console.log('='.repeat(80) + '\n');
console.log(allSql);
console.log('='.repeat(80));
console.log('\nAfter applying this SQL:');
console.log('1. Refresh the browser (http://localhost:8084)');
console.log('2. Try booking an appointment again');
console.log('3. It should now work! ✅\n');

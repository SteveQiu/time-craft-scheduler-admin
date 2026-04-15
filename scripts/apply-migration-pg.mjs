import pg from 'pg';
import * as fs from 'fs';

const { Client } = pg;

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      let value = rest.join('=').trim();
      value = value.replace(/^"(.*)"$/, '$1');
      env[key] = value;
    }
  }
});

const secretContent = fs.readFileSync('.secret', 'utf-8');
const secret = {};
secretContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('=')) {
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      secret[key] = rest.join('=');
    }
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = secret.SUPABASE_KEY;

// Parse Supabase URL to get connection info
// Format: https://PROJECT_ID.supabase.co
const projectMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
const PROJECT_ID = projectMatch?.[1];

// Build PostgreSQL connection string
// Format: postgres://postgres:PASSWORD@HOST:PORT/postgres
const pgHost = `${PROJECT_ID}.supabase.co`;
const pgUser = 'postgres';
const pgPassword = SERVICE_KEY; // For Supabase, SERVICE_KEY is the postgres password
const pgDatabase = 'postgres';
const pgPort = 5432;

console.log('🔗 Connecting to PostgreSQL...\n');
console.log(`Host: ${pgHost}`);
console.log(`User: ${pgUser}`);
console.log(`Database: ${pgDatabase}`);

const client = new Client({
  user: pgUser,
  password: pgPassword,
  host: pgHost,
  port: pgPort,
  database: pgDatabase,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('✅ Connected!\n');
  
  // Read the migration
  const migrationSQL = fs.readFileSync('./supabase/migrations/20260415_immediate_opening_lock_on_booking.sql', 'utf-8');
  
  console.log('📋 Executing migration...\n');
  
  // Execute the migration
  await client.query(migrationSQL);
  
  console.log('✅ Migration executed successfully!\n');
  
  // Verify the function works
  console.log('🔍 Verifying function...');
  const result = await client.query(
    "SELECT to_regprocedure('public.book_opening(uuid, uuid)') as func"
  );
  
  if (result.rows[0]?.func) {
    console.log(`✅ Function verified: ${result.rows[0].func}`);
  } else {
    console.log('⚠️  Could not verify function');
  }
  
  // Check the function source
  const sourceResult = await client.query(`
    SELECT routine_definition 
    FROM information_schema.routines
    WHERE routine_name = 'book_opening' 
    AND routine_schema = 'public'
  `);
  
  if (sourceResult.rows.length > 0) {
    const functionSource = sourceResult.rows[0].routine_definition;
    if (functionSource.includes('UPDATE openings SET is_available = false')) {
      console.log('✅ Function includes UPDATE statement - ready for immediate locking!');
    } else {
      console.log('⚠️  Function does not include UPDATE statement');
    }
  }
  
} catch (e) {
  console.log(`❌ Error: ${e.message}`);
  if (e.code === 'ECONNREFUSED') {
    console.log('\n⚠️  Could not connect to database');
    console.log('This may be because:');
    console.log('  1. SERVICE_KEY is not a valid postgres password');
    console.log('  2. Your Supabase project has IP restrictions');
    console.log('\nPlease apply the migration manually:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Click "SQL Editor"');
    console.log('4. Click "New query"');
    console.log('5. Run: node apply-opening-lock-migration.js > migration.sql');
    console.log('6. Copy the SQL and paste it into the editor');
  }
} finally {
  await client.end();
}

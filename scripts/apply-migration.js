import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
const env = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.+)/)?.[1];
const supabaseServiceRoleKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Read and execute migration
const migrationPath = path.join(__dirname, 'supabase/migrations/20260415041100_fix_booking_unavailable.sql');
const sql = fs.readFileSync(migrationPath, 'utf-8');

(async () => {
  try {
    console.log('Applying migration...');
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
    
    if (error) {
      // Try direct SQL execution instead
      const { data, error: execError } = await supabase.from('__test__').select('*');
      console.log('Attempting direct SQL execution...');
      
      // Use the SQL statement directly
      const lines = sql.split('\n').filter(l => l.trim() && !l.trim().startsWith('--'));
      for (const line of lines) {
        if (line.trim()) {
          console.log('Executing:', line.substring(0, 80) + '...');
        }
      }
      
      // Actually, let's just show the SQL to the user
      console.log('\n❌ Cannot directly execute via API.');
      console.log('\n📋 Please run this SQL in your Supabase dashboard:\n');
      console.log('---');
      console.log(sql);
      console.log('---\n');
    } else {
      console.log('✅ Migration applied successfully!');
    }
  } catch (err) {
    console.error('Error:', err.message);
    console.log('\n❌ API approach failed. Please run this SQL manually:\n');
    console.log('---');
    console.log(sql);
    console.log('---\n');
    console.log('Steps:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Create new query');
    console.log('5. Paste and run the SQL above');
  }
})();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ygghiowacyeqktwlsjxo.supabase.co';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_LGzr9sQ7QCazLxDaHd7EcA_eEM7Bqqt';

if (!supabaseKey) {
  console.error('❌ SUPABASE_PUBLISHABLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log('🔍 Checking appointments table schema...\n');

    // Try to query appointments to see what columns exist
    const { data, error } = await supabase
      .from('appointments')
      .select()
      .limit(1);

    if (error) {
      console.error('❌ Query error:', error.message);
      process.exit(1);
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('📋 Current appointments columns:');
      columns.forEach(col => console.log(`  - ${col}`));

      if (columns.includes('approved_by')) {
        console.log('\n✅ approved_by column already exists!');
        console.log('\n📌 Migration ready for testing');
      } else {
        console.log('\n⚠️  approved_by column NOT found');
        console.log('\n📝 You need to manually apply the migration:');
        console.log('   1. Go to: https://app.supabase.com/project/ygghiowacyeqktwlsjxo/sql');
        console.log('   2. Copy content from: supabase/migrations/20260416_add_approval_tracking.sql');
        console.log('   3. Click "Run"\n');
      }
    } else {
      console.log('No appointments found to inspect');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkSchema();

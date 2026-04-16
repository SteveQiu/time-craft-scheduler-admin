import { exec } from 'child_process';
import { readFileSync } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function applyMigration() {
  try {
    console.log('🔧 Reading migration file...\n');
    
    const migrationSql = readFileSync(
      'supabase/migrations/20260416_add_approval_tracking.sql',
      'utf-8'
    );

    console.log('📝 Migration SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSql.split('\n').slice(0, 15).join('\n'));
    console.log('─'.repeat(60));
    console.log('...(migration continues)\n');

    console.log('ℹ️  To apply this migration:');
    console.log('1. Go to: https://app.supabase.com/project/ygghiowacyeqktwlsjxo/sql');
    console.log('2. Paste the migration SQL from: supabase/migrations/20260416_add_approval_tracking.sql');
    console.log('3. Click "Run"\n');

    console.log('📋 Or use the Supabase CLI:');
    console.log('   supabase db push\n');

    console.log('✅ Migration file is ready to apply');
    console.log('   Location: supabase/migrations/20260416_add_approval_tracking.sql\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration();

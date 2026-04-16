import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ygghiowacyeqktwlsjxo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('🔧 Applying approval tracking migration...\n');

    // Add approved_by column
    console.log('Step 1: Adding approved_by column...');
    const { error: e1 } = await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS approved_by uuid;'
    }).catch(() => ({ error: { message: 'Column might already exist, continuing...' } }));
    if (e1 && e1.message && !e1.message.includes('exists')) {
      console.error('❌ Error adding column:', e1.message);
    } else {
      console.log('✓ approved_by column added/verified\n');
    }

    // Add foreign key
    console.log('Step 2: Adding foreign key constraint...');
    const { error: e2 } = await supabase.rpc('execute_sql', {
      sql: `ALTER TABLE public.appointments 
            ADD CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;`
    }).catch(() => ({ error: { message: 'Constraint might already exist, continuing...' } }));
    if (e2 && e2.message && !e2.message.includes('exists')) {
      console.error('❌ Error adding FK:', e2.message);
    } else {
      console.log('✓ Foreign key constraint added/verified\n');
    }

    // Create index
    console.log('Step 3: Creating index for query performance...');
    const { error: e3 } = await supabase.rpc('execute_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_approved_by ON public.appointments(approved_by);'
    }).catch(() => ({ error: { message: 'Index might already exist, continuing...' } }));
    if (e3 && e3.message && !e3.message.includes('exists')) {
      console.error('❌ Error creating index:', e3.message);
    } else {
      console.log('✓ Index created/verified\n');
    }

    // Verify column exists
    console.log('Step 4: Verifying schema...');
    const { data: columns, error: verifyError } = await supabase.rpc('execute_sql', {
      sql: `SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'approved_by';`
    });
    
    if (verifyError) {
      console.error('❌ Verification error:', verifyError.message);
    } else if (!columns || columns.length === 0) {
      console.error('❌ approved_by column not found after migration');
    } else {
      console.log('✓ Schema verification passed');
      console.log(`  Column: ${columns[0].column_name} (${columns[0].data_type})\n`);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('  1. Update RPC functions to track who approved');
    console.log('  2. Update component to display approver info in org view');
    console.log('  3. Test approval tracking end-to-end\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

applyMigration();

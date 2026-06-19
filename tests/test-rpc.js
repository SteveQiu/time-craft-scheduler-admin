import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://dbabjfydcllqbjpolhym.supabase.co',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function test() {
  console.log('Testing get_public_profile_by_id RPC...\n');
  
  const { data, error } = await supabase.rpc('get_public_profile_by_id', { 
    profile_id: '276a81aa-0d96-4992-9105-23c3cbb4c092' 
  });
  
  if (error) {
    console.error('❌ RPC Error:', error);
  } else {
    console.log('✅ RPC Response:', JSON.stringify(data, null, 2));
  }
}

test();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dbabjfydcllqbjpolhym.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYWJqZnlkY2xscWJqcG9saHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzk1OTYsImV4cCI6MjA2ODYxNTU5Nn0.SyYn3n9-sA9A2gwoIgY06oHHRg8Lfw1p3XNjV7Dadys'
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

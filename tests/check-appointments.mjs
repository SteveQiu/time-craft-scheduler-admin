#!/usr/bin/env node

import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dbabjfydcllqbjpolhym.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

(async () => {
  const url = `${SUPABASE_URL}/rest/v1/appointments?select=id,opening_id,user_id,status,created_at&order=created_at.desc&limit=5`;
  const response = await fetch(url, {
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    }
  });
  const data = await response.json();
  console.log('Recent appointments:');
  console.log(JSON.stringify(data, null, 2));
})();

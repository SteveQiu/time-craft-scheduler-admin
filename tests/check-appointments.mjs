#!/usr/bin/env node

const SUPABASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYWJqZnlkY2xscWJqcG9saHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzk1OTYsImV4cCI6MjA2ODYxNTU5Nn0.SyYn3n9-sA9A2gwoIgY06oHHRg8Lfw1p3XNjV7Dadys';

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

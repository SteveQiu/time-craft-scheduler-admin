import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Read .env file
const envContent = fs.readFileSync('.env', 'utf-8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...rest] = trimmed.split('=');
  if (key && rest.length > 0) {
    let value = rest.join('=').trim();
    value = value.replace(/^"(.*)"$/, '$1');
    env[key] = value;
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('=== DETAILED OPENING INFO FOR TEST ORG ===\n');

const providerId = 'f0927dd8-9e7d-4830-a6b5-c96a3c627fe9';

const { data: allOpenings, error } = await supabase
  .from('openings')
  .select('id, date, service, worker, is_available, hourly_rate')
  .eq('user_id', providerId)
  .eq('is_available', true)
  .gte('date', '2026-04-15');

if (error) {
  console.log('Error:', error);
} else {
  console.log(`Found ${allOpenings?.length || 0} openings total\n`);
  
  const services = [...new Set(allOpenings?.map(o => o.service))];
  const workers = [...new Set(allOpenings?.map(o => o.worker))];
  
  console.log(`Services: ${services.join(', ')}`);
  console.log(`Workers: ${workers.join(', ')}\n`);
  
  // Check Strategy + Steve specifically
  console.log('Strategy + Steve openings:');
  const strategySteve = allOpenings?.filter(o => o.service === 'Strategy' && o.worker === 'Steve');
  console.log(`Count: ${strategySteve?.length || 0}\n`);
  
  if (strategySteve && strategySteve.length > 0) {
    strategySteve.forEach(o => {
      console.log(`- ${o.date}: ${o.id}`);
    });
  } else {
    console.log('No Strategy + Steve openings found!');
    console.log('\nAll Strategy openings:');
    const strategy = allOpenings?.filter(o => o.service === 'Strategy');
    strategy?.forEach(o => {
      console.log(`  - ${o.date}: ${o.worker}`);
    });
  }
}

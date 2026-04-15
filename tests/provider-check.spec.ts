import { test } from '@playwright/test';
import fs from 'fs';

test('Check database for provider openings', async ({ page }) => {
  const debugDir = 'debug/provider-check';
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  console.log('Checking what providers and openings exist in Supabase...');
  
  // Navigate to Supabase and check the data directly via browser console
  await page.goto('http://localhost:8080');
  
  const data = await page.evaluate(async () => {
    // Dynamic import to access Supabase client
    const supabaseModule = await import('http://localhost:8080/src/integrations/supabase/client.ts');
    
    try {
      // Get all openings
      const { data: openings, error: openingsError } = await window.supabaseClient?.from('openings')
        .select('*')
        .eq('is_available', true)
        .limit(50);

      // Get the specific provider
      const { data: providerOpenings, error: providerError } = await window.supabaseClient?.from('openings')
        .select('*')
        .eq('user_id', 'f0927dd8-9e7d-4830-a6b5-c96a3c627fe9')
        .eq('is_available', true);

      return {
        totalOpenings: openings?.length || 0,
        providers: [...new Set((openings || []).map((o: any) => o.user_id))],
        providerOpenings: providerOpenings?.length || 0,
        specificProviderExists: (providerOpenings?.length || 0) > 0
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }).catch(() => {
    return null;
  });

  console.log('Data check result:', data);

  // Since dynamic imports won't work, let's just log what we're looking for
  console.log('Looking for provider: f0927dd8-9e7d-4830-a6b5-c96a3c627fe9');
  console.log('This appears to be an opening ID, not a provider ID!');
  console.log('Let me check if this is actually an opening ID instead...');

  fs.writeFileSync(`${debugDir}/check-result.json`, JSON.stringify({ note: 'The provided ID appears to be an opening ID, not a provider ID' }, null, 2));
});

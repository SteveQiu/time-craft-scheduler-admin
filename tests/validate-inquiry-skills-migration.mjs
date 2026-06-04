// Validate that the get_premium_inquiry_providers migration includes skills column
// Run: node tests/validate-inquiry-skills-migration.mjs
import { readFileSync } from 'fs';

const MIGRATION_FILE = 'supabase/migrations/20260604_inquiry_respect_email_privacy.sql';

console.log('=== Inquiry Skills Migration Validation ===\n');

let sql;
try {
  sql = readFileSync(MIGRATION_FILE, 'utf-8');
} catch (e) {
  console.error(`❌ FAIL: Cannot read ${MIGRATION_FILE}`);
  process.exit(1);
}

const checks = [
  {
    name: 'DROP FUNCTION before CREATE',
    test: () => sql.includes('DROP FUNCTION IF EXISTS public.get_premium_inquiry_providers()'),
  },
  {
    name: 'RETURNS TABLE includes skills text[]',
    test: () => /RETURNS\s+TABLE\s*\([\s\S]*?skills\s+text\[\]/i.test(sql),
  },
  {
    name: 'email respects email_public toggle',
    test: () => /CASE\s+WHEN\s+p\.email_public\s+THEN\s+p\.email\s+ELSE\s+NULL\s+END/i.test(sql),
  },
  {
    name: 'phone respects phone_public toggle',
    test: () => /CASE\s+WHEN\s+p\.phone_public\s+THEN\s+p\.phone\s+ELSE\s+NULL\s+END/i.test(sql),
  },
  {
    name: 'skills respects skills_public toggle',
    test: () => /CASE\s+WHEN\s+p\.skills_public\s+THEN.*?skills.*?ELSE\s+'{}'/i.test(sql),
  },
  {
    name: 'Joins subscriptions for premium/pro check',
    test: () => /JOIN.*subscriptions[\s\S]*?plan_type\s+IN\s*\('premium',\s*'pro'\)/i.test(sql),
  },
  {
    name: 'Filters by custom_inquiry_open = true',
    test: () => sql.includes('custom_inquiry_open = true'),
  },
  {
    name: 'Checks subscription expiry',
    test: () => /expires_at\s+IS\s+NULL\s+OR\s+s\.expires_at\s*>\s*NOW\(\)/i.test(sql),
  },
];

let passed = 0;
let failed = 0;

for (const check of checks) {
  const ok = check.test();
  console.log(`${ok ? '✅' : '❌'} ${check.name}`);
  if (ok) passed++;
  else failed++;
}

console.log(`\n${passed}/${checks.length} checks passed`);
if (failed > 0) {
  console.error(`\n❌ ${failed} checks FAILED`);
  process.exit(1);
} else {
  console.log('\n✅ All migration validation checks passed');
}

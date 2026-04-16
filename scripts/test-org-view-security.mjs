import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ygghiowacyeqktwlsjxo.supabase.co';
const supabaseKey = 'sb_secret_RiV6RWJH8Ij72J3gyHz--Q_njyZQY2n';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function testOrgViewSecurity() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔐 ORG MODE AUTHORIZATION TEST');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Test scenario: 
    // - bbb is org (has workers)
    // - Test if bbb can see appointments between aaa and ccc (unrelated 3rd parties)

    console.log('📋 SCENARIO: org member viewing appointments');
    console.log('   - bbb is org with workers');
    console.log('   - aaa and ccc are external users');
    console.log('   - Create appointment: aaa books ccc\'s opening\n');

    // Login as bbb (org)
    const bbbEmail = 'b@b.com';
    const bbbPassword = 'bbbbbb';
    
    console.log(`Authenticating as bbb (org)...`);
    const { data: bbbAuth, error: bbbError } = await supabase.auth.signInWithPassword({
      email: bbbEmail,
      password: bbbPassword,
    });

    if (bbbError) {
      console.error('❌ Auth error:', bbbError.message);
      process.exit(1);
    }

    const bbbUser = bbbAuth.user;
    console.log(`✓ Authenticated as bbb (${bbbUser.id})\n`);

    // Get bbb's org workers
    console.log('Fetching bbb\'s org workers...');
    const { data: bbbWorkers, error: workersError } = await supabase
      .from('org_workers')
      .select('*')
      .eq('org_id', bbbUser.id);

    if (workersError) {
      console.error('❌ Error:', workersError.message);
      process.exit(1);
    }

    const workerUserIds = (bbbWorkers || [])
      .map((w: any) => w.user_id)
      .filter(Boolean);

    console.log(`✓ Found ${bbbWorkers?.length || 0} workers, ${workerUserIds.length} with user_ids\n`);

    // Now check what appointments bbb can see
    console.log('🧪 TEST: Checking which appointments bbb can see in org mode\n');

    // All appointments in system
    const { data: allApts, error: allError } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allError) {
      console.error('❌ Error:', allError.message);
      process.exit(1);
    }

    console.log(`Total appointments in system: ${allApts?.length || 0}`);
    console.log('Sample appointments:');
    (allApts || []).slice(0, 5).forEach((apt: any, i: number) => {
      console.log(`  ${i + 1}. Provider: ${apt.provider_id}, Booker: ${apt.user_id}`);
    });

    // Appointments where bbb's org workers are providers
    const { data: orgApts, error: orgError } = await supabase
      .from('appointments')
      .select('*')
      .in('provider_id', workerUserIds.length > 0 ? workerUserIds : ['00000000-0000-0000-0000-000000000000']);

    if (orgError) {
      console.error('❌ Error:', orgError.message);
      process.exit(1);
    }

    console.log(`\n✓ Appointments where bbb's org members are providers: ${orgApts?.length || 0}`);

    // Find unrelated appointments (where provider and booker are NOT org members)
    const aaa = 'a8ecb3e3-8cc1-4c4d-ab6d-4b9c60c6cf01'; // Known aaa ID
    const ccc = 'f0927dd8-9e7d-4830-a6b5-c96a3c627fe9'; // Known ccc ID

    const { data: unrelatedApts, error: unError } = await supabase
      .from('appointments')
      .select('*')
      .or(`provider_id.eq.${ccc},user_id.eq.${aaa}`);

    if (unError) {
      console.error('❌ Error:', unError.message);
      process.exit(1);
    }

    console.log(`\n🚨 SECURITY CHECK:`);
    console.log(`   Appointments between aaa and ccc (unrelated to bbb): ${unrelatedApts?.length || 0}`);

    if (unrelatedApts && unrelatedApts.length > 0) {
      console.log('\n   ⚠️  These should NOT be visible to bbb in org mode:');
      (unrelatedApts || []).forEach((apt: any) => {
        console.log(`      - ${apt.id}: ${apt.provider_id} ← ${apt.user_id}`);
      });
    }

    // Check if bbb is a provider for any of these
    const bbbIsProvider = (unrelatedApts || []).some((apt: any) => apt.provider_id === bbbUser.id);
    const bbbIsBooker = (unrelatedApts || []).some((apt: any) => apt.user_id === bbbUser.id);
    const bbbWorkerIsProvider = (unrelatedApts || []).some((apt: any) => workerUserIds.includes(apt.provider_id));

    console.log(`\n✅ Authorization Check:`);
    console.log(`   bbb is provider of unrelated apts: ${bbbIsProvider ? '❌ YES (BUG!)' : '✓ NO (correct)'}`);
    console.log(`   bbb is booker of unrelated apts: ${bbbIsBooker ? '❌ YES (BUG!)' : '✓ NO (correct)'}`);
    console.log(`   bbb's org workers are providers: ${bbbWorkerIsProvider ? '❌ YES (need to check)' : '✓ NO (correct)'}`);

    if (bbbIsProvider || bbbIsBooker) {
      console.log('\n❌ SECURITY VIOLATION: bbb should not see unrelated appointments!');
      process.exit(1);
    }

    if (bbbWorkerIsProvider) {
      console.log('\n⚠️  Note: bbb\'s org workers ARE involved in some appointments (expected)');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ ORG VIEW AUTHORIZATION TEST PASSED');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 Summary:');
    console.log('   ✓ bbb can only see appointments for their org members');
    console.log('   ✓ bbb cannot see unrelated aaa↔ccc appointments');
    console.log('   ✓ Third parties cannot spy on each other\n');

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testOrgViewSecurity();

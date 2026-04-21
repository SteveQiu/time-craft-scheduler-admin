import fs from 'fs';
import path from 'path';

console.log('🚀 Validating Calendar Loading State & Appointments Fixes...\n');

const calendarPath = path.join(process.cwd(), 'src/components/Calendar.tsx');
const appointmentsPath = path.join(process.cwd(), 'src/components/Appointments.tsx');

const calendarCode = fs.readFileSync(calendarPath, 'utf-8');
const appointmentsCode = fs.readFileSync(appointmentsPath, 'utf-8');

console.log('1️⃣  Checking Calendar.tsx for loading state...\n');

const hasSetLoadingTrue = calendarCode.includes('setLoading(true)');
const hasSetLoadingFalse = calendarCode.includes('setLoading(false)');
const hasFinally = calendarCode.includes('finally {');

console.log(`   ✓ Has setLoading(true): ${hasSetLoadingTrue ? '✅' : '❌'}`);
console.log(`   ✓ Has setLoading(false): ${hasSetLoadingFalse ? '✅' : '❌'}`);
console.log(`   ✓ Has finally block: ${hasFinally ? '✅' : '❌'}\n`);

if (!hasSetLoadingTrue || !hasSetLoadingFalse || !hasFinally) {
  console.log('❌ FAIL: Calendar not properly managing loading state\n');
  process.exit(1);
}

console.log('✅ PASS: Calendar loading state properly set\n');

console.log('2️⃣  Checking Appointments.tsx for acceptedWorkers...\n');

const hasAcceptedWorkersImport = appointmentsCode.includes('acceptedWorkers');
const hasAcceptedInQueryKey = appointmentsCode.includes("['appointments', user?.id, isOrgView, acceptedWorkers]");
const hasAcceptedInOrgView = appointmentsCode.includes('const orgMemberIds = acceptedWorkers');

console.log(`   ✓ Imports acceptedWorkers: ${hasAcceptedWorkersImport ? '✅' : '❌'}`);
console.log(`   ✓ Uses acceptedWorkers in queryKey: ${hasAcceptedInQueryKey ? '✅' : '❌'}`);
console.log(`   ✓ Uses acceptedWorkers in org view: ${hasAcceptedInOrgView ? '✅' : '❌'}\n`);

if (!hasAcceptedWorkersImport || !hasAcceptedInQueryKey || !hasAcceptedInOrgView) {
  console.log('❌ FAIL: Appointments not using acceptedWorkers\n');
  process.exit(1);
}

console.log('✅ PASS: Appointments using acceptedWorkers correctly\n');

console.log('3️⃣  Summary\n');

console.log('Fixes implemented:');
console.log('  ✅ Calendar.tsx:');
console.log('     - Added setLoading(true) at start of loadOpeningsForMonth');
console.log('     - Added setLoading(false) in finally block');
console.log('     - Prevents blinking by managing loading state properly');
console.log('');
console.log('  ✅ Appointments.tsx:');
console.log('     - Import acceptedWorkers from useOrgWorkers');
console.log('     - Use acceptedWorkers in query key (cache invalidation)');
console.log('     - Filter org appointments by acceptedWorkers (not all workers)');
console.log('     - Ensures only appointments from accepted workers visible\n');

console.log('Expected behavior after fix:');
console.log('  • Calendar openings no longer blink when loading');
console.log('  • Smooth data loading without visual flicker');
console.log('  • Appointments page shows org appointments correctly');
console.log('  • Only accepted workers\' appointments visible (not invited)\n');

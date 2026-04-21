#!/usr/bin/env node

/**
 * Comprehensive Playwright Validation Runner
 * 
 * Validates the fixes for:
 * 1. Calendar openings blinking fix (loading state management)
 * 2. Appointments org view fix (acceptedWorkers filtering)
 * 
 * Runs Playwright tests and generates validation report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORT_FILE = path.join(process.cwd(), 'tests', 'PLAYWRIGHT_VALIDATION_REPORT.md');

console.log('🧪 Starting Playwright Validation Tests...\n');

// Create report
let report = `# Playwright Validation Report

Generated: ${new Date().toISOString()}

## Tests to Run

1. **Calendar Blinking Fix** (\`validate-blinking-fix.spec.ts\`)
   - Tests that openings load without visual flicker
   - Verifies loading state prevents DOM churn
   - Validates month transitions are smooth
   - Captures visual regressions

2. **Appointments Org View Fix** (\`validate-appointments-org-view.spec.ts\`)
   - Tests that org appointments display correctly
   - Verifies acceptedWorkers filtering works
   - Validates HTML structure and content
   - Checks for DOM stability

## Running Tests

\`\`\`bash
npm test -- tests/validate-blinking-fix.spec.ts --headed
npm test -- tests/validate-appointments-org-view.spec.ts --headed
\`\`\`

## Results

### Calendar Blinking Fix
`;

try {
  console.log('Running calendar blinking fix tests...');
  const output = execSync(
    'npx playwright test tests/validate-blinking-fix.spec.ts --reporter=list',
    {
      encoding: 'utf-8',
      stdio: 'pipe',
    }
  );

  report += `
✅ Tests completed successfully
\n\`\`\`
${output}
\`\`\`
`;

  console.log(output);
} catch (error) {
  report += `
❌ Tests failed or need setup
\n\`\`\`
${error.stdout || error.message}
\`\`\`
`;

  console.log('⚠️ Calendar tests need dev server running');
}

report += `
### Appointments Org View Fix
`;

try {
  console.log('\nRunning appointments org view tests...');
  const output = execSync(
    'npx playwright test tests/validate-appointments-org-view.spec.ts --reporter=list',
    {
      encoding: 'utf-8',
      stdio: 'pipe',
    }
  );

  report += `
✅ Tests completed successfully
\n\`\`\`
${output}
\`\`\`
`;

  console.log(output);
} catch (error) {
  report += `
❌ Tests failed or need setup
\n\`\`\`
${error.stdout || error.message}
\`\`\`
`;

  console.log('⚠️ Appointments tests need dev server running');
}

// Check for snapshots
const snapshotDir = path.join(process.cwd(), 'tests', 'snapshots');
report += `
## Snapshots Generated

`;

if (fs.existsSync(snapshotDir)) {
  const snapshots = execSync(`find "${snapshotDir}" -type f`, {
    encoding: 'utf-8',
  })
    .trim()
    .split('\n')
    .filter(Boolean);

  if (snapshots.length > 0) {
    report += `Found ${snapshots.length} snapshot files:
\n${snapshots.map((s) => `- ${path.basename(s)}`).join('\n')}`;
  } else {
    report += 'No snapshots found yet. Run tests with \`--update-snapshots\` to create them.';
  }
} else {
  report += 'Snapshot directory not yet created. Will be created on first test run.';
}

report += `

## Validation Checklist

### Calendar Blinking Fix
- [ ] No blinking observed when loading calendar in org mode
- [ ] Snapshots show consistent rendering across loads
- [ ] Loading state visible during data fetch (if applicable)
- [ ] Opening cards stable when transitioning months
- [ ] HTML snapshot matches baseline

### Appointments Org View Fix
- [ ] Appointments display in org view mode
- [ ] HTML structure contains expected fields (provider, date, time, status)
- [ ] No flickering on page load
- [ ] Consistent content across page reloads
- [ ] Only org workers' appointments visible
- [ ] Visual regression tests passed

## Instructions for Manual Validation

If tests cannot run (dev server not available), perform manual browser validation:

1. **Calendar Blinking Fix**
   - Start dev server: \`npm run dev\`
   - Navigate to: http://localhost:8080/calendar?mode=org
   - Observe: Do openings load smoothly without flickering?
   - Test: Click next month - do openings disappear/reappear smoothly?

2. **Appointments Org View Fix**
   - Start dev server: \`npm run dev\`
   - Navigate to: http://localhost:8080/appointments?mode=org
   - Observe: Do appointments display for org workers?
   - Test: Reload page - do appointments remain stable?

## Notes

- Tests use Playwright with snapshots for visual regression detection
- HTML comparisons ignore timestamps to avoid false failures
- \`--headed\` mode recommended for visual observation
- Tests create snapshots in \`tests/snapshots/\` directory

`;

// Save report
fs.writeFileSync(REPORT_FILE, report);
console.log(`\n📋 Validation report saved to: ${REPORT_FILE}`);
console.log('\n✅ Validation setup complete!');
console.log(`\nNext steps:\n1. Start dev server: npm run dev\n2. Run tests: npm test`);

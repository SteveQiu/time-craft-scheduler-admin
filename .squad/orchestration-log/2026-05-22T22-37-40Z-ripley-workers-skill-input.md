# ripley-workers-skill-input

- time: 2026-05-22T22:37:40Z
- scope: workers edit-mode skill input parity
- files: `src/components/Workers.tsx`, `scripts/snapshot-appointments.cjs`
- change: replaced comma textarea with add-skill input + button + stacked rows + remove action; snapshot script now checks `/workers`
- verify: `npx tsc --noEmit`, `npm run build`, `node scripts/snapshot-appointments.cjs` green
- handoff: Ralph confirmed non-blank render; screenshot in `tmp-snapshots/`

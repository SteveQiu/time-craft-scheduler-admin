# Handling Network-Restricted Migrations in Supabase

## Problem

When deploying to cloud environments with network restrictions, direct PostgreSQL connections (port 5432) are often blocked by firewalls. This prevents programmatic SQL migration execution.

## Solutions

### Solution 1: Manual Deployment via SQL Editor (RECOMMENDED)

**Why**: Most reliable, secure, and doesn't require additional setup.

**Steps**:
```bash
# 1. Show the migration SQL
node scripts/display-migration-sql.mjs

# 2. Go to Supabase dashboard
# https://supabase.com/dashboard

# 3. Click SQL Editor → New Query

# 4. Copy-paste the SQL

# 5. Click RUN
```

### Solution 2: Using Supabase CLI with Access Token

**Why**: Automated deployment if you have a Supabase access token.

**Setup**:
```bash
# 1. Create a Supabase access token
# https://supabase.com/dashboard/account/tokens

# 2. Set environment variable
export SUPABASE_ACCESS_TOKEN="your-token-here"

# 3. Link project
npx supabase link --project-ref dbabjfydcllqbjpolhym

# 4. Push migrations
npx supabase db push
```

**Automated**:
```bash
node scripts/push-migrations-with-token.mjs
```

### Solution 3: Direct PostgreSQL (When Network Allows)

**Why**: Direct control, works when port 5432 is open.

```bash
node scripts/apply-migration-direct-pg.mjs
```

### Solution 4: SSH Tunnel (For Restricted Networks)

**Why**: Bypass firewall by tunneling through an intermediary server.

```bash
# Create SSH tunnel to a server with database access
ssh -L 5433:db-host:5432 intermediate-server

# Then update connection string in script and run
PGHOST=localhost PGPORT=5433 node scripts/apply-migration-direct-pg.mjs
```

### Solution 5: Supabase Cloud Functions / Edge Functions

**Why**: Run migrations from Supabase-hosted code that has database access.

Create an Edge Function that runs the migration, then trigger it from your deployment.

---

## Recommended Workflow

### Local Development
```bash
# Direct connection usually works locally
npx supabase db push
```

### CI/CD Pipeline with Restricted Network

**Option A: Use SQL Editor (Safest)**
```yaml
# .github/workflows/deploy.yml
- name: Show migration SQL
  run: node scripts/display-migration-sql.mjs > migration.sql

- name: Comment on PR
  uses: actions/github-script@v6
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: 'Migration needed: Apply SQL from `migration.sql`'
      })
```

**Option B: With Supabase Token**
```yaml
- name: Push migrations
  run: npx supabase db push
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_PROJECT_REF: dbabjfydcllqbjpolhym
```

**Option C: Via API Gateway**
Deploy an API endpoint that can execute SQL, then call it from CI/CD.

---

## Scripts Available

### Display Scripts
- `scripts/display-migration-sql.mjs` - Show SQL for manual copy-paste
- `scripts/display-deployment-checklist.mjs` - Step-by-step deployment guide

### Automated Scripts
- `scripts/apply-migration-direct-pg.mjs` - Direct PostgreSQL connection
- `scripts/apply-migration-via-cli.mjs` - Supabase CLI (requires network access)
- `scripts/push-migrations-with-token.mjs` - With Supabase access token
- `scripts/apply-migration-auto.mjs` - Auto-detect best method

### Status Checks
- `scripts/check-migration-status.mjs` - Check if migration is applied
- `scripts/verify-credentials.mjs` - Verify .secret file credentials

---

## Troubleshooting

### "Connection refused / timeout"
- Network firewall blocking port 5432
- Solution: Use Solution 1 (Manual) or Solution 2 (With token)

### "Access denied"
- Invalid credentials in .secret
- Solution: Verify SERVICE_KEY in Supabase dashboard

### "Function not found"
- Migration not yet applied
- Solution: Apply using any of the methods above

### "Already exists" errors
- Migration already applied
- Solution: This is safe - idempotent migrations will just recreate

---

## Best Practices

1. **Always have a manual fallback**
   - Document SQL clearly
   - Keep SQL Editor link ready
   - Have team member access as backup

2. **Use version control**
   - Store migrations in git
   - Tag releases with migration info
   - Reference commit SHA in deployment

3. **Test first**
   - Run migration locally first
   - Verify with test data
   - Test rollback procedure

4. **Monitor**
   - Check migration status after deployment
   - Run verification test: `node tests/verify-opening-lock.mjs`
   - Monitor application logs for errors

5. **Document**
   - Update CHANGELOG.md with migration
   - Document any schema changes
   - Link to migration files in commit messages

---

## Security Considerations

### Never
- Commit .secret file
- Expose SERVICE_KEY in logs
- Use weak passwords
- Run untested migrations

### Always
- Use environment variables for secrets
- Test migrations locally first
- Have a rollback plan
- Document changes

---

## Example: Complete Deployment Flow

```bash
# 1. Local verification
npm run test

# 2. Check status
node scripts/check-migration-status.mjs

# 3. Display migration
node scripts/display-migration-sql.mjs

# 4. Apply (choose method)
# Method A: Manual (Recommended for restricted networks)
node scripts/display-deployment-checklist.mjs

# Method B: Automated (if network allows)
node scripts/apply-migration-auto.mjs

# 5. Verify
node tests/verify-opening-lock.mjs

# 6. Test application
npm run dev

# 7. Commit with reference
git add .
git commit -m "feat: apply opening lock migration

Applies: 20260415_immediate_opening_lock_on_booking
Change: Mark openings unavailable immediately when booked
Test: node tests/verify-opening-lock.mjs"
```

---

## References

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Supabase Migration Guide](https://supabase.com/docs/guides/migrations/intro)

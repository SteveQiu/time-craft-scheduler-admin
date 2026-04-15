# ⚡ DEPLOYMENT - MANUAL STEP REQUIRED

## Step 1: ✅ DONE - SQL Ready
Migration SQL saved to `.github/MIGRATION_SQL_TO_APPLY.sql`

## Step 2: ⏳ MANUAL - Apply to Supabase

1. Go to: https://supabase.com/dashboard
2. Select project: **dbabjfydcllqbjpolhym**
3. Click: **SQL Editor** (left sidebar)
4. Click: **+ New Query**
5. Open file: `.github/MIGRATION_CLEAN.sql` ⬅️ USE THIS ONE (not SQL_TO_APPLY)
6. Copy entire SQL content
7. Paste into Supabase editor
8. Click: **RUN** button
9. Wait for ✅ green checkmark

## Step 3: ✅ AFTER Manual Step - Run Verification

```bash
node tests/verify-opening-lock.mjs
```

Expect: `✅ VERIFICATION PASSED`

## Step 4: ✅ AFTER Manual Step - Test UI

```bash
npm run dev
```

Then:
- Sign in → Browse → Pick service/worker → Click time → Click Book
- Switch browser/user → Same slot should show "Not Available"

## Step 5: ✅ AFTER Verification - Commit

```bash
git add .
git commit -m "Deploy: immediate opening lock on booking"
```

---

## Status
- ✅ Step 1: SQL ready
- ⏳ Step 2: **YOU NEED TO DO THIS** (paste SQL in Supabase)
- ⏳ Step 3-5: Waiting for step 2

**Let me know when you complete step 2** → I'll run verification & commit.

# Playwright Test Performance Investigation

**Date**: 2025-01-29  
**Total Tests**: 122 tests in 69 files  
**Current Duration**: ~50+ minutes  
**Target**: Identify root causes + optimization recommendations

---

## 🔍 Key Findings

### 1. **NO PLAYWRIGHT CONFIG** ⚠️ CRITICAL
- **Issue**: No `playwright.config.ts` or `playwright.config.js` found
- **Impact**: Running with Playwright defaults
  - Default workers: ~50% CPU cores (likely 1-2 workers)
  - Default timeout: 30 seconds per test
  - No parallelization optimization
  - No shared browser contexts
  - No global setup/teardown

### 2. **Excessive `waitForTimeout()` Calls** 🐌 HIGH IMPACT
- **Count**: 300+ occurrences across test files
- **Pattern**: Hard-coded delays everywhere:
  ```typescript
  await page.waitForTimeout(300);
  await page.waitForTimeout(1000);
  await page.waitForTimeout(2000);
  await page.waitForTimeout(15000);  // Some tests wait 15 seconds!
  ```
- **Impact**: Cumulative wait time = **hundreds of seconds** wasted
- **Root Cause**: Tests don't wait for specific UI state, just arbitrary delays

### 3. **Excessive `networkidle` Waits** 🌐 HIGH IMPACT
- **Count**: 44+ occurrences
- **Pattern**: 
  ```typescript
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle');
  ```
- **Impact**: `networkidle` waits for 500ms of no network activity
  - Can add 1-2+ seconds per navigation
  - Total: 44+ × 2s = **~90+ seconds** minimum
- **Better Alternative**: Wait for specific elements instead

### 4. **Hardcoded Localhost Ports** 🔌 MEDIUM IMPACT
- **Pattern**: Tests use different ports:
  - `http://localhost:8080`
  - `http://localhost:8082`
  - `http://localhost:8083`
  - `http://localhost:8084`
  - `http://localhost:8087`
- **Risk**: Tests fail if dev server not running on expected port
- **Inefficiency**: No shared baseURL configuration

### 5. **Heavy Screenshot Usage** 📸 MEDIUM IMPACT
- **Count**: 100+ screenshot calls across tests
- **Pattern**: Screenshots for debugging, not assertions
  ```typescript
  await page.screenshot({ path: 'debug/e2e-01-browse-list.png' });
  await page.screenshot({ path: 'debug/e2e-02-provider-detail.png' });
  ```
- **Impact**: Disk I/O overhead + time per screenshot (~100-200ms each)
- **Total**: ~10-20 seconds cumulative

### 6. **Test Organization Issues** 📁 LOW-MEDIUM IMPACT
- **69 test files** for 122 tests = avg 1.77 tests/file
- **Many debug/validation files** (26+ files with "debug" or "validate" prefix)
- **48 non-spec files** (.mjs, .js utilities) mixed with test files
- **Impact**: Poor test discovery overhead, cluttered test directory

### 7. **Redundant Test Coverage** 🔄 MEDIUM IMPACT
- Multiple similar tests for same flows:
  - `booking-e2e.spec.ts`
  - `booking-simple.spec.ts`
  - `booking-complete-final.spec.ts`
  - `booking-complete-flow.spec.ts`
  - `booking-flow-e2e.spec.ts`
  - `full-booking-flow-debug.spec.ts`
- Similar for: auth, opening creation, validation
- **Impact**: Running duplicate test logic = wasted time

### 8. **No Shared Authentication** 🔐 HIGH IMPACT
- Every test signs in individually:
  ```typescript
  await page.goto('http://localhost:8080/auth');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.press('input[type="password"]', 'Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  ```
- **Count**: 50+ tests perform individual login
- **Impact**: 50 × 3-5 seconds = **150-250 seconds** on auth alone
- **Solution**: Use Playwright storage state for shared auth

### 9. **Large Timeout Values** ⏱️ LOW-MEDIUM IMPACT
- Many tests use large timeouts:
  - `timeout: 10000` (10 seconds)
  - `timeout: 5000` (5 seconds)
- While reasonable, indicates flaky waits or slow operations

---

## 📊 Estimated Time Breakdown

| Category | Time Impact | Percentage |
|----------|-------------|------------|
| Hard waits (`waitForTimeout`) | ~300-500s | 40% |
| Auth operations (no reuse) | ~150-250s | 20% |
| `networkidle` waits | ~90-120s | 15% |
| Sequential execution (no config) | ~200-300s | 15% |
| Screenshots | ~10-20s | 3% |
| Other overhead | ~50-100s | 7% |
| **TOTAL** | **~800-1290s** | **100%** |
| **Actual reported** | **~3000s (50 min)** | - |

*Note: Gap suggests additional factors (slow CI/machine, network issues, or test failures with retries)*

---

## ✅ Recommended Optimizations (Priority Order)

### **PRIORITY 1: Create Playwright Config** 🚀
**Impact**: Reduce runtime by ~40-50%

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 8,  // Parallel workers
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',  // Don't screenshot everything
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Expected gain**: 10-15 minutes (using 8 workers vs 1-2)

---

### **PRIORITY 2: Replace Hard Waits with Smart Waits** ⚡
**Impact**: Reduce runtime by ~30-40%

**Before**:
```typescript
await page.click('button');
await page.waitForTimeout(1000);
const element = page.locator('.result');
```

**After**:
```typescript
await page.click('button');
await page.locator('.result').waitFor({ state: 'visible' });
```

**Action Items**:
1. Replace ALL `waitForTimeout()` with:
   - `page.locator(selector).waitFor()`
   - `expect(locator).toBeVisible()`
   - `page.waitForResponse()`
   - `page.waitForSelector()`

2. Create helper functions:
```typescript
async function waitForUIUpdate(page, selector) {
  await page.locator(selector).waitFor({ state: 'visible', timeout: 5000 });
}
```

**Expected gain**: 5-10 minutes

---

### **PRIORITY 3: Implement Shared Authentication** 🔑
**Impact**: Reduce runtime by ~10-15%

**Setup** (`auth.setup.ts`):
```typescript
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/auth');
  await page.fill('input[type="email"]', process.env.TEST_EMAIL);
  await page.fill('input[type="password"]', process.env.TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/calendar');
  await page.context().storageState({ path: 'auth.json' });
});
```

**In tests**:
```typescript
test.use({ storageState: 'auth.json' });

test('my test', async ({ page }) => {
  // Already authenticated!
  await page.goto('/calendar');
});
```

**Expected gain**: 3-5 minutes

---

### **PRIORITY 4: Replace `networkidle` with Specific Waits** 🎯
**Impact**: Reduce runtime by ~5-10%

**Before**:
```typescript
await page.goto(url, { waitUntil: 'networkidle' });
```

**After**:
```typescript
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.locator('[data-testid="main-content"]').waitFor();
```

**Expected gain**: 1-3 minutes

---

### **PRIORITY 5: Consolidate & Organize Tests** 📦
**Impact**: Reduce maintenance + runtime by ~5-10%

**Actions**:
1. **Delete debug/validation tests** that are no longer needed
2. **Merge duplicate tests** (booking-e2e, booking-simple, etc.)
3. **Move utility scripts** (.mjs, .js) to separate `tests/utils/` folder
4. **Group tests by feature**:
   - `tests/auth/` - authentication tests
   - `tests/booking/` - booking flow tests
   - `tests/calendar/` - calendar tests
   - `tests/openings/` - opening creation tests

**Expected gain**: 2-5 minutes

---

### **PRIORITY 6: Use `baseURL` and Environment Variables** 🌍
**Impact**: Improve maintainability

**Before**:
```typescript
await page.goto('http://localhost:8080/auth');
```

**After** (with config):
```typescript
await page.goto('/auth');  // baseURL prepended automatically
```

---

### **PRIORITY 7: Disable Screenshots in Tests** 📸
**Impact**: Reduce runtime by ~2-3%

- Remove debug screenshots from test code
- Use `screenshot: 'only-on-failure'` in config
- Keep screenshots only for visual regression tests

**Expected gain**: 30-60 seconds

---

## 🎯 Expected Results After All Optimizations

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Runtime | ~50 minutes | **8-12 minutes** | **75-80%** faster |
| Workers | 1-2 | 8 | 4-8x parallelism |
| Auth Time | 150-250s | 10-20s | 90% reduction |
| Hard Waits | 300-500s | 0s | 100% elimination |
| `networkidle` | 90-120s | 0s | 100% elimination |

---

## 🚀 Quick Wins (Implement Today)

1. **Create `playwright.config.ts`** with 8 workers (15 min effort)
2. **Replace top 20 `waitForTimeout()` calls** with smart waits (30 min effort)
3. **Implement shared auth** for main test suites (20 min effort)

**Total effort**: ~1 hour  
**Expected improvement**: **30-40 minutes** faster test runs

---

## 📝 Next Steps

1. ✅ **Create Playwright config** (this commit)
2. ⏭️ **Replace hard waits** (follow-up PR)
3. ⏭️ **Implement auth setup** (follow-up PR)
4. ⏭️ **Cleanup test directory** (follow-up PR)
5. ⏭️ **Add test documentation** (follow-up)

---

## 🔗 References

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Parallelization](https://playwright.dev/docs/test-parallel)
- [Authentication Setup](https://playwright.dev/docs/auth)
- [Auto-waiting](https://playwright.dev/docs/actionability)

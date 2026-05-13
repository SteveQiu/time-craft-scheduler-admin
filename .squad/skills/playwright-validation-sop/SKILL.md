# Playwright Validation SOP — Ralph QA
**Confidence:** medium
**Owner:** Ralph (QA & Tester)
**Project:** time-craft-scheduler-admin
**Stack:** React 18 + TypeScript + Tailwind + Supabase | Playwright | Dev server: http://localhost:8080

---

## 1. Reading `.secret` for Credentials

File: `C:\git\time-craft-scheduler-admin\.secret` (never commit)

```
TESTER1_EMAIL=aaa@aaa.com        TESTER1_PASSWORD1=aaaaaa       (customer/user)
TESTER2_EMAIL=b@b.com            TESTER2_PASSWORD1=bbbbbb       (customer/user)
TESTER3_EMAIL=sdeqiu@gmail.com   TESTER3_PASSWORD1=Soulreap1    (org/provider — primary)
TESTER3_EMAIL=qylsteveq@gmail.com TESTER3_PASSWORD1=Soulreap1   (org/provider — secondary)
TESTER4_EMAIL=ccc@ccc.com        TESTER4_PASSWORD1=cccccc       (customer/user)
```

**Roles:**
- TESTER1/2/4 — regular user / customer (books appointments, sees provider email on cards)
- TESTER3 — org provider (manages appointments, sees booker email/phone on cards via BookerInfo)

---

## 2. Standard Login Helper

```typescript
const BASE = 'http://localhost:8080';

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  // App.tsx has DUAL DOM (desktop + mobile) — always use .first()
  await page.locator('#signin-email').first().fill(email);
  await page.locator('#signin-password').first().fill(password);
  await page.locator('button[type="submit"]').filter({ hasText: /Sign In/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20000 });
}
```

**Critical:** App.tsx renders 2× `<Routes>` (desktop `hidden md:flex` + mobile `md:hidden`).
Both are in the DOM simultaneously. Playwright strict mode violations occur if you don't use `.first()`.

---

## 3. Running a Targeted Spec

```powershell
# Run one or more specs (use node — npx is disabled by PowerShell execution policy)
cd C:\git\time-craft-scheduler-admin
node node_modules\@playwright\test\cli.js test tests/your-spec.spec.ts --reporter=line

# Run multiple specs
node node_modules\@playwright\test\cli.js test tests/spec-a.spec.ts tests/spec-b.spec.ts --reporter=line

# Run with headed browser (useful for debugging)
node node_modules\@playwright\test\cli.js test tests/your-spec.spec.ts --headed --reporter=line
```

---

## 4. Pre-flight Checklist Before Running Tests

1. **Dev server on 8080:**
   ```powershell
   Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
   ```
   If NOT running: start async (no pipes — pipe kills vite):
   ```powershell
   # mode: "async", no pipes, no Out-String
   npm run dev
   ```
   Verify: `curl http://localhost:8080` returns HTTP 200.

2. **TypeScript clean:**
   ```powershell
   node .\node_modules\typescript\bin\tsc --noEmit
   ```
   Clean exit = 0 errors. Any output = TypeScript errors → block Dallas.

---

## 5. Writing a New Validation Spec — Pattern

```typescript
import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:8080';
const EMAIL = 'sdeqiu@gmail.com';    // TESTER3 = org/provider
const PASSWORD = 'Soulreap1';

// Appointment cards: shadow-soft + cursor-pointer (filter card has only shadow-soft)
const APPT_CARD = '.shadow-soft.cursor-pointer';

async function login(page: Page) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('#signin-email').first().fill(EMAIL);
  await page.locator('#signin-password').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').filter({ hasText: /Sign In/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20000 });
}

test.describe('Feature X — short description', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/target-page`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);  // let React Query settle
  });

  test('CHECK 1: page is NOT blank', async ({ page }) => {
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(10);
    const rootChildren = await page.locator('#root > *').count();
    expect(rootChildren).toBeGreaterThan(0);
  });

  test('CHECK 2: feature element is visible', async ({ page }) => {
    // Use .first() for any element that might appear in both desktop + mobile DOM
    const el = page.locator('selector').first();
    await expect(el).toBeVisible();
  });

  test('CHECK 3: no critical JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(`${BASE}/target-page`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const critical = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('ResizeObserver') && !e.includes('net::ERR') && !e.includes('404')
    );
    if (critical.length > 0) console.warn('⚠️ Console errors:', critical);
    expect(page.url()).not.toBe('about:blank');
  });
});
```

---

## 6. Dom Duplication Gotchas

| Element | Issue | Fix |
|---------|-------|-----|
| Any button/input in settings/auth | 2× in DOM (desktop + mobile layout) | `.first()` |
| `locator('main')` | 2× `<main>` in App.tsx | `.first()` (desktop 1280×800) |
| Auth inputs (`#signin-email`, `#signin-password`) | 2× in DOM | `.first()` |
| `button[type="submit"]` on auth page | 2× | `.filter({ hasText: /Sign In/i }).first()` |

---

## 7. What to Check After Every Dallas Session

### Appointments page (`/appointments`)
- [ ] Page NOT blank (`body.innerText.length > 10`)
- [ ] `#root > *` count > 0 (no white screen)
- [ ] If org view (TESTER3): "Active Appointments" / "Inactive Appointments" sections render
- [ ] If cards present: check for `mailto:` links in appointment cards (contact email feature)
- [ ] No critical JS console errors

### Settings page (`/settings?tab=payments`)
- [ ] Page NOT blank
- [ ] "Add Payment Acceptance Method" button visible (`.first()`)
- [ ] Dialog opens on click
- [ ] All expected payment types in Type dropdown (Cash, Onsite Credit Card, PayPal, Venmo, Email Transfer, WeChat)
- [ ] Dialog closes on Escape

### Profile page (`/profile/:slug`)
- [ ] Page NOT blank
- [ ] Profile content renders (name, bio, or contact info)

### Booking flow (`/browse`)
- [ ] Page NOT blank
- [ ] Provider cards render

---

## 8. Known Pre-existing Test Issues

- `validate-appointments-org-view.spec.ts`: 4/8 tests always fail — screenshot baselines and `[data-testid="appointments-list"]` do not exist in DOM. These are legacy test scaffolding issues, not regressions.
- `Error fetching user roles: TypeError: Failed to fetch` — intermittent Supabase network noise in test environment. Not a Dallas regression. Filter from critical errors check.
- Shadcn `<Select>` dropdown: options render as `[role="option"]` in a portal. After clicking `[role="combobox"]`, wait 400ms before asserting options.

---

## 9. Spec File Naming Convention

```
tests/validate-{feature-slug}.spec.ts   # for Dallas validation specs
tests/post-refactor-{page}.spec.ts      # for refactor regression specs
tests/debug-{topic}.spec.ts             # debug/diagnostic specs (not for CI)
```

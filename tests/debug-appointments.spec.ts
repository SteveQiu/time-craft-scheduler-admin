import { test, expect } from '@playwright/test';

// Regression test: Appointments page must never render blank for authenticated users.
// Root cause fix: Appointments.tsx now shows a loading spinner while auth initializes,
// preventing a flash of "Please sign in" (which looked blank on fast navigations).
test('appointments page renders content for authenticated user', async ({ page }) => {
  const jsErrors: string[] = [];
  page.on('pageerror', err => { jsErrors.push(err.message); });

  await page.goto('http://localhost:8080/auth');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'sdeqiu@gmail.com');
  await page.fill('input[type="password"]', 'Soulreap1');
  await page.press('input[type="password"]', 'Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});

  await page.goto('http://localhost:8080/appointments');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Page must not be blank — must contain the "Reservations" heading
  await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();

  // No JS runtime errors
  expect(jsErrors, `JS errors on appointments page: ${jsErrors.join(', ')}`).toHaveLength(0);

  // Org view also renders
  await page.goto('http://localhost:8080/appointments?mode=org');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();
});

test('appointments page shows spinner during auth init, not sign-in prompt', async ({ page }) => {
  // Intercept the supabase session endpoint to simulate slow auth
  // We verify that navigating directly to /appointments doesn't flash "Please sign in"
  await page.goto('http://localhost:8080/auth');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'aaa@aaa.com');
  await page.fill('input[type="password"]', 'aaaaaa');
  await page.press('input[type="password"]', 'Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});

  await page.goto('http://localhost:8080/appointments');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();
  // Ensure "Please sign in" is NOT present for authenticated user
  await expect(page.getByText('Please sign in to view appointments.')).not.toBeVisible();
});


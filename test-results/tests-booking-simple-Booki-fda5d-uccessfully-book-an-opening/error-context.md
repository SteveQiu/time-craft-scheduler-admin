# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\booking-simple.spec.ts >> Booking - Simple End to End >> should successfully book an opening
- Location: tests\booking-simple.spec.ts:4:3

# Error details

```
Error: Book button not found
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - generic [ref=e3]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - img [ref=e7]
        - heading "AppointmentPro" [level=1] [ref=e9]
      - button "Sign In" [active] [ref=e12] [cursor=pointer]:
        - img
        - generic [ref=e13]: Sign In
    - separator [ref=e14]
    - main [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]:
          - button [ref=e19] [cursor=pointer]:
            - img
          - generic [ref=e20]:
            - heading "Test Org" [level=2] [ref=e21]
            - paragraph [ref=e22]: 325 available appointments
        - generic [ref=e23]:
          - generic [ref=e24]:
            - heading "Services" [level=3] [ref=e25]
            - generic [ref=e27] [cursor=pointer]: Hair cut
            - generic [ref=e29] [cursor=pointer]: Strategy
            - generic [ref=e31] [cursor=pointer]: Tutor
            - generic [ref=e33] [cursor=pointer]: Detection
            - generic [ref=e35] [cursor=pointer]: Offence
          - generic [ref=e37]:
            - heading "Workers" [level=3] [ref=e38]
            - generic [ref=e40] [cursor=pointer]: Steve
            - generic [ref=e41]:
              - generic [ref=e42]:
                - button "←" [ref=e43] [cursor=pointer]
                - generic [ref=e44]: April 2026
                - button "→" [ref=e45] [cursor=pointer]
              - generic [ref=e46]:
                - generic [ref=e47]: Sun
                - generic [ref=e48]: Mon
                - generic [ref=e49]: Tue
                - generic [ref=e50]: Wed
                - generic [ref=e51]: Thu
                - generic [ref=e52]: Fri
                - generic [ref=e53]: Sat
                - button "29" [disabled] [ref=e54]
                - button "30" [disabled] [ref=e55]
                - button "31" [disabled] [ref=e56]
                - button "1" [disabled] [ref=e57]
                - button "2" [disabled] [ref=e58]
                - button "3" [disabled] [ref=e59]
                - button "4" [disabled] [ref=e60]
                - button "5" [disabled] [ref=e61]
                - button "6" [disabled] [ref=e62]
                - button "7" [disabled] [ref=e63]
                - button "8" [disabled] [ref=e64]
                - button "9" [disabled] [ref=e65]
                - button "10" [disabled] [ref=e66]
                - button "11" [disabled] [ref=e67]
                - button "12" [disabled] [ref=e68]
                - button "13" [disabled] [ref=e69]
                - button "14" [disabled] [ref=e70]
                - button "15" [ref=e71] [cursor=pointer]
                - button "16" [ref=e72] [cursor=pointer]
                - button "17" [ref=e73] [cursor=pointer]
                - button "18" [ref=e74] [cursor=pointer]
                - button "19" [ref=e75] [cursor=pointer]
                - button "20" [ref=e76] [cursor=pointer]
                - button "21" [ref=e77] [cursor=pointer]
                - button "22" [disabled] [ref=e78]
                - button "23" [disabled] [ref=e79]
                - button "24" [ref=e80] [cursor=pointer]
                - button "25" [ref=e81] [cursor=pointer]
                - button "26" [disabled] [ref=e82]
                - button "27" [disabled] [ref=e83]
                - button "28" [disabled] [ref=e84]
                - button "29" [disabled] [ref=e85]
                - button "30" [disabled] [ref=e86]
                - button "1" [disabled] [ref=e87]
                - button "2" [disabled] [ref=e88]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Booking - Simple End to End', () => {
  4   |   test('should successfully book an opening', async ({ page, context }, testInfo) => {
  5   |     // Set larger viewport to see all columns
  6   |     page.setViewportSize({ width: 1400, height: 900 });
  7   |     
  8   |     // Clear storage
  9   |     await context.clearCookies();
  10  |     
  11  |     console.log('\n' + '='.repeat(80));
  12  |     console.log('STEP 1: Navigate to browse list');
  13  |     console.log('='.repeat(80));
  14  |     
  15  |     await page.goto('http://localhost:8084/browse', { waitUntil: 'networkidle' });
  16  |     await page.screenshot({ path: 'debug/step-01-browse-list.png' });
  17  |     
  18  |     console.log('\nSTEP 2: Click provider');
  19  |     const provider = page.locator('[class*="grid"]').locator('[class*="rounded-lg"]').first();
  20  |     await provider.click();
  21  |     await page.waitForLoadState('networkidle');
  22  |     await page.screenshot({ path: 'debug/step-02-provider-detail.png' });
  23  |     
  24  |     console.log('\nSTEP 3: Click service');
  25  |     // Find all service cards - they're inside "Services" section
  26  |     const servicesSection = page.locator('text=Services').locator('..').locator('[class*="rounded"]').first();
  27  |     await servicesSection.click();
  28  |     await page.waitForTimeout(300);
  29  |     await page.screenshot({ path: 'debug/step-03-service-selected.png' });
  30  |     
  31  |     console.log('\nSTEP 4: Click worker');
  32  |     const workersSection = page.locator('text=Workers').locator('..').locator('[class*="rounded"]').first();
  33  |     await workersSection.click();
  34  |     await page.waitForTimeout(300);
  35  |     await page.screenshot({ path: 'debug/step-04-worker-selected.png' });
  36  |     
  37  |     console.log('\nSTEP 5: Select date');
  38  |     // Calendar should now be visible - find any button with a date number
  39  |     await page.evaluate(() => window.scrollBy(0, 200));
  40  |     
  41  |     // Get all buttons in a grid-cols-7 (calendar)
  42  |     const dateButtons = page.locator('button').filter(btn => {
  43  |       return btn.evaluate(el => {
  44  |         const parent = el.closest('[class*="grid-cols-7"]');
  45  |         return parent !== null && /^\d{1,2}$/.test((el.textContent || '').trim());
  46  |       });
  47  |     });
  48  |     
  49  |     const firstDate = dateButtons.first();
  50  |     await firstDate.click();
  51  |     await page.waitForTimeout(300);
  52  |     await page.screenshot({ path: 'debug/step-05-date-selected.png' });
  53  |     
  54  |     console.log('\nSTEP 6: Scroll to see times');
  55  |     await page.evaluate(() => window.scrollBy(400, 0));
  56  |     await page.waitForTimeout(300);
  57  |     await page.screenshot({ path: 'debug/step-06-times-visible.png' });
  58  |     
  59  |     console.log('\nSTEP 7: Click Book');
  60  |     const bookBtn = page.locator('button:has-text("Book")').first();
  61  |     
  62  |     if (!(await bookBtn.isVisible().catch(() => false))) {
  63  |       console.log('❌ Book button not visible!');
  64  |       console.log('Page content:', await page.content().then(h => h.substring(0, 500)));
> 65  |       throw new Error('Book button not found');
      |             ^ Error: Book button not found
  66  |     }
  67  |     
  68  |     await bookBtn.click();
  69  |     await page.waitForTimeout(500);
  70  |     await page.screenshot({ path: 'debug/step-07-booking-dialog.png' });
  71  |     
  72  |     console.log('\nSTEP 8: Confirm booking');
  73  |     
  74  |     // Capture all console messages
  75  |     const consoleLogs: string[] = [];
  76  |     page.on('console', msg => {
  77  |       consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  78  |       if (msg.type() === 'error' || msg.type() === 'log') {
  79  |         console.log(`  Browser ${msg.type()}:`, msg.text());
  80  |       }
  81  |     });
  82  |     
  83  |     // Click confirm - need to find the right button in the dialog
  84  |     const dialog = page.locator('[role="alertdialog"]');
  85  |     const confirmBtn = dialog.locator('button').last(); // Last button is usually Confirm
  86  |     await confirmBtn.click();
  87  |     
  88  |     await page.waitForTimeout(1500);
  89  |     await page.screenshot({ path: 'debug/step-08-result.png' });
  90  |     
  91  |     console.log('\nSTEP 9: Check result');
  92  |     const success = await page.locator('text=Appointment booked successfully').isVisible().catch(() => false);
  93  |     const error = await page.locator('text=Failed to book appointment').isVisible().catch(() => false);
  94  |     
  95  |     console.log('\n' + '='.repeat(80));
  96  |     console.log('RESULT:');
  97  |     console.log('  ✅ Success toast:', success);
  98  |     console.log('  ❌ Error toast:', error);
  99  |     console.log('\nConsole logs:');
  100 |     consoleLogs.forEach(log => console.log('  ' + log));
  101 |     console.log('='.repeat(80) + '\n');
  102 |     
  103 |     expect(success).toBeTruthy();
  104 |   });
  105 | });
  106 | 
```
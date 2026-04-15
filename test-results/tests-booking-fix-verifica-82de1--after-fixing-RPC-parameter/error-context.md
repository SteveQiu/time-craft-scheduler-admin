# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\booking-fix-verification.spec.ts >> Booking Fix Verification >> should successfully book an appointment after fixing RPC parameter
- Location: tests\booking-fix-verification.spec.ts:4:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T":
    - list:
      - status [ref=e3]:
        - img [ref=e5]
        - generic [ref=e8]: Failed to book appointment. Please try again.
  - generic [ref=e9]:
    - generic [ref=e11]:
      - generic [ref=e12]:
        - img [ref=e13]
        - heading "AppointmentPro" [level=1] [ref=e15]
      - button "Sign In" [ref=e18] [cursor=pointer]:
        - img
        - generic [ref=e19]: Sign In
    - separator [ref=e20]
    - main [ref=e22]:
      - generic [ref=e23]:
        - generic [ref=e24]:
          - button [ref=e25] [cursor=pointer]:
            - img
          - generic [ref=e26]:
            - heading "Test Org" [level=2] [ref=e27]
            - paragraph [ref=e28]: 325 available appointments
        - generic [ref=e29]:
          - generic [ref=e30]:
            - heading "Services" [level=3] [ref=e31]
            - generic [ref=e33] [cursor=pointer]: Hair cut
            - generic [ref=e35] [cursor=pointer]: Strategy
            - generic [ref=e37] [cursor=pointer]: Tutor
            - generic [ref=e39] [cursor=pointer]: Detection
            - generic [ref=e41] [cursor=pointer]: Offence
          - generic [ref=e43]:
            - heading "Workers" [level=3] [ref=e44]
            - generic [ref=e46] [cursor=pointer]: Steve
            - generic [ref=e47]:
              - generic [ref=e48]:
                - button "←" [ref=e49] [cursor=pointer]
                - generic [ref=e50]: April 2026
                - button "→" [ref=e51] [cursor=pointer]
              - generic [ref=e52]:
                - generic [ref=e53]: Sun
                - generic [ref=e54]: Mon
                - generic [ref=e55]: Tue
                - generic [ref=e56]: Wed
                - generic [ref=e57]: Thu
                - generic [ref=e58]: Fri
                - generic [ref=e59]: Sat
                - button "29" [disabled] [ref=e60]
                - button "30" [disabled] [ref=e61]
                - button "31" [disabled] [ref=e62]
                - button "1" [disabled] [ref=e63]
                - button "2" [disabled] [ref=e64]
                - button "3" [disabled] [ref=e65]
                - button "4" [disabled] [ref=e66]
                - button "5" [disabled] [ref=e67]
                - button "6" [disabled] [ref=e68]
                - button "7" [disabled] [ref=e69]
                - button "8" [disabled] [ref=e70]
                - button "9" [disabled] [ref=e71]
                - button "10" [disabled] [ref=e72]
                - button "11" [disabled] [ref=e73]
                - button "12" [disabled] [ref=e74]
                - button "13" [disabled] [ref=e75]
                - button "14" [disabled] [ref=e76]
                - button "15" [ref=e77] [cursor=pointer]
                - button "16" [ref=e78] [cursor=pointer]
                - button "17" [ref=e79] [cursor=pointer]
                - button "18" [ref=e80] [cursor=pointer]
                - button "19" [ref=e81] [cursor=pointer]
                - button "20" [ref=e82] [cursor=pointer]
                - button "21" [ref=e83] [cursor=pointer]
                - button "22" [disabled] [ref=e84]
                - button "23" [disabled] [ref=e85]
                - button "24" [ref=e86] [cursor=pointer]
                - button "25" [ref=e87] [cursor=pointer]
                - button "26" [disabled] [ref=e88]
                - button "27" [disabled] [ref=e89]
                - button "28" [disabled] [ref=e90]
                - button "29" [disabled] [ref=e91]
                - button "30" [disabled] [ref=e92]
                - button "1" [disabled] [ref=e93]
                - button "2" [disabled] [ref=e94]
          - generic [ref=e95]:
            - generic [ref=e96]:
              - heading "Available Times" [level=3] [ref=e97]
              - paragraph [ref=e98]: 4/14/2026
            - generic [ref=e100]:
              - generic [ref=e101]:
                - generic [ref=e102]:
                  - generic [ref=e103]: 09:00
                  - generic [ref=e104]: 1h
                - button "Book" [ref=e105] [cursor=pointer]
                - generic [ref=e106]:
                  - button [ref=e107] [cursor=pointer]:
                    - img
                  - button [ref=e108] [cursor=pointer]:
                    - img
              - generic [ref=e109]:
                - generic [ref=e110]:
                  - generic [ref=e111]: 10:00
                  - generic [ref=e112]: 1h
                - button "Book" [ref=e113] [cursor=pointer]
                - generic [ref=e114]:
                  - button [ref=e115] [cursor=pointer]:
                    - img
                  - button [ref=e116] [cursor=pointer]:
                    - img
              - generic [ref=e117]:
                - generic [ref=e118]:
                  - generic [ref=e119]: 11:00
                  - generic [ref=e120]: 1h
                - button "Book" [ref=e121] [cursor=pointer]
                - generic [ref=e122]:
                  - button [ref=e123] [cursor=pointer]:
                    - img
                  - button [ref=e124] [cursor=pointer]:
                    - img
              - generic [ref=e125]:
                - generic [ref=e126]:
                  - generic [ref=e127]: 12:00
                  - generic [ref=e128]: 1h
                - button "Book" [ref=e129] [cursor=pointer]
                - generic [ref=e130]:
                  - button [ref=e131] [cursor=pointer]:
                    - img
                  - button [ref=e132] [cursor=pointer]:
                    - img
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - generic [ref=e135]: 13:00
                  - generic [ref=e136]: 1h
                - button "Book" [ref=e137] [cursor=pointer]
                - generic [ref=e138]:
                  - button [ref=e139] [cursor=pointer]:
                    - img
                  - button [ref=e140] [cursor=pointer]:
                    - img
              - generic [ref=e141]:
                - generic [ref=e142]:
                  - generic [ref=e143]: 14:00
                  - generic [ref=e144]: 1h
                - button "Book" [ref=e145] [cursor=pointer]
                - generic [ref=e146]:
                  - button [ref=e147] [cursor=pointer]:
                    - img
                  - button [ref=e148] [cursor=pointer]:
                    - img
              - generic [ref=e149]:
                - generic [ref=e150]:
                  - generic [ref=e151]: 15:00
                  - generic [ref=e152]: 1h
                - button "Book" [ref=e153] [cursor=pointer]
                - generic [ref=e154]:
                  - button [ref=e155] [cursor=pointer]:
                    - img
                  - button [ref=e156] [cursor=pointer]:
                    - img
              - generic [ref=e157]:
                - generic [ref=e158]:
                  - generic [ref=e159]: 16:00
                  - generic [ref=e160]: 1h
                - button "Book" [ref=e161] [cursor=pointer]
                - generic [ref=e162]:
                  - button [ref=e163] [cursor=pointer]:
                    - img
                  - button [ref=e164] [cursor=pointer]:
                    - img
              - generic [ref=e165]:
                - generic [ref=e166]:
                  - generic [ref=e167]: 17:00
                  - generic [ref=e168]: 1h
                - button "Book" [ref=e169] [cursor=pointer]
                - generic [ref=e170]:
                  - button [ref=e171] [cursor=pointer]:
                    - img
                  - button [ref=e172] [cursor=pointer]:
                    - img
              - generic [ref=e173]:
                - generic [ref=e174]:
                  - generic [ref=e175]: 18:00
                  - generic [ref=e176]: 1h
                - button "Book" [ref=e177] [cursor=pointer]
                - generic [ref=e178]:
                  - button [ref=e179] [cursor=pointer]:
                    - img
                  - button [ref=e180] [cursor=pointer]:
                    - img
              - generic [ref=e181]:
                - generic [ref=e182]:
                  - generic [ref=e183]: 19:00
                  - generic [ref=e184]: 1h
                - button "Book" [ref=e185] [cursor=pointer]
                - generic [ref=e186]:
                  - button [ref=e187] [cursor=pointer]:
                    - img
                  - button [ref=e188] [cursor=pointer]:
                    - img
              - generic [ref=e189]:
                - generic [ref=e190]:
                  - generic [ref=e191]: 20:00
                  - generic [ref=e192]: 1h
                - button "Book" [ref=e193] [cursor=pointer]
                - generic [ref=e194]:
                  - button [ref=e195] [cursor=pointer]:
                    - img
                  - button [ref=e196] [cursor=pointer]:
                    - img
```

# Test source

```ts
  36  |     await workerCard.click();
  37  |     await page.waitForTimeout(300);
  38  |     
  39  |     // Take screenshot after worker selection
  40  |     await page.screenshot({ path: 'debug/04-booking-test-worker-selected.png' });
  41  |     
  42  |     // Wait for calendar to appear
  43  |     await page.locator('[class*="grid"][class*="grid-cols-7"]').waitFor({ timeout: 5000 });
  44  |     
  45  |     // Scroll down to see if Available Times is below the fold
  46  |     await page.evaluate(() => window.scrollBy(0, 500));
  47  |     await page.waitForTimeout(300);
  48  |     
  49  |     // Take screenshot after scrolling
  50  |     await page.screenshot({ path: 'debug/05c-booking-test-after-scroll.png' });
  51  |     
  52  |     // Try clicking on a visible date (like date 15 or 20)
  53  |     const dateButton = page.locator('button').filter({ hasText: /^15$/ }).first();
  54  |     await dateButton.click().catch(() => {
  55  |       console.log('Failed to click date 15, trying date 20');
  56  |     });
  57  |     await page.waitForTimeout(500);
  58  |     
  59  |     // Take screenshot after date click
  60  |     await page.screenshot({ path: 'debug/05d-booking-test-after-date-click.png' });
  61  |     
  62  |     // Wait for Available Times section with OR fallback
  63  |     try {
  64  |       await page.locator('text=Available Times').waitFor({ timeout: 5000 });
  65  |     } catch (e) {
  66  |       console.log('Available Times still not found, checking page content...');
  67  |       // Check if times are in a scrollable container
  68  |       await page.evaluate(() => window.scrollBy(300, 0));
  69  |       await page.waitForTimeout(300);
  70  |       await page.screenshot({ path: 'debug/05e-booking-test-scrolled-right.png' });
  71  |     }
  72  |     
  73  |     // Click Book button on first available time slot
  74  |     const bookButton = page.locator('button:has-text("Book")').first();
  75  |     if (await bookButton.isVisible().catch(() => false)) {
  76  |       await bookButton.click();
  77  |       await page.waitForTimeout(500);
  78  |     } else {
  79  |       console.log('Book button not found, times section might not have rendered');
  80  |       await page.screenshot({ path: 'debug/05f-booking-test-no-book-button.png' });
  81  |       throw new Error('Book button not found - Available Times section did not render');
  82  |     }
  83  |     
  84  |     // Take screenshot showing the confirmation dialog
  85  |     await page.screenshot({ path: 'debug/06-booking-test-confirmation-dialog.png' });
  86  |     
  87  |     // Wait for confirmation dialog
  88  |     await page.locator('[role="alertdialog"]').waitFor({ timeout: 5000 });
  89  |     
  90  |     // Verify dialog shows booking details
  91  |     const dialogContent = page.locator('[role="alertdialog"]');
  92  |     await expect(dialogContent).toContainText('Service:');
  93  |     await expect(dialogContent).toContainText('Worker:');
  94  |     await expect(dialogContent).toContainText('Date:');
  95  |     await expect(dialogContent).toContainText('Time:');
  96  |     
  97  |     // Listen for console errors before confirming
  98  |     const consoleErrors: string[] = [];
  99  |     page.on('console', msg => {
  100 |       if (msg.type() === 'error') {
  101 |         consoleErrors.push(msg.text());
  102 |       }
  103 |     });
  104 |     
  105 |     // Click Confirm button to submit booking - use specific button selector
  106 |     const confirmButton = page.locator('[role="alertdialog"] button[type="button"]:nth-child(2)');
  107 |     await confirmButton.click();
  108 |     await page.waitForTimeout(1000);
  109 |     
  110 |     // Take screenshot showing result
  111 |     await page.screenshot({ path: 'debug/07-booking-test-result.png' });
  112 |     
  113 |     // Wait for either success or error toast
  114 |     const successToast = page.locator('text=Appointment booked successfully');
  115 |     const errorToast = page.locator('text=Failed to book appointment');
  116 |     
  117 |     // Check which toast appears
  118 |     const successVisible = await successToast.isVisible().catch(() => false);
  119 |     const errorVisible = await errorToast.isVisible().catch(() => false);
  120 |     
  121 |     // Log results
  122 |     console.log('✅ Success toast visible:', successVisible);
  123 |     console.log('❌ Error toast visible:', errorVisible);
  124 |     console.log('Console errors:', consoleErrors);
  125 |     
  126 |     // Verify booking succeeded
  127 |     if (successVisible) {
  128 |       console.log('✅ BOOKING FIXED: Appointment booked successfully!');
  129 |     } else if (errorVisible) {
  130 |       console.log('❌ BOOKING FAILED: Still getting error');
  131 |       // Get error details
  132 |       const errorMessage = await errorToast.textContent();
  133 |       console.log('Error message:', errorMessage);
  134 |     }
  135 |     
> 136 |     expect(successVisible).toBeTruthy();
      |                            ^ Error: expect(received).toBeTruthy()
  137 |   });
  138 | });
  139 | 
```
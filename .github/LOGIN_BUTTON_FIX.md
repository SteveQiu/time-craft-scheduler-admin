# Login Button Click Issue - Root Cause & Solution

## Problem
The Sign In, Sign Up, and password reset buttons don't submit forms when clicked with mouse, but work with Enter key.

## Root Cause
Radix UI Tabs component uses React portals which removes TabsContent from the normal DOM hierarchy. This breaks the parent-child relationship between form and button elements.

When button is in DOM:
```html
<form>
  <input>
  <Button> ← part of form
</form>
```

When button is in a portal:
```html
<form>
  <input>
</form>

<!-- Portal renders button outside form -->
<div data-radix-portal>
  <Button> ← NOT connected to form
</div>
```

Result:
- ✅ Enter key still works (fires from input while in form)
- ❌ Button click doesn't work (button is outside form)

## Solution Options

### Option 1: Add onClick handler with form.requestSubmit()  
**Status**: Attempted but still fails because button can't find form with `.closest('form')`

### Option 2: Use form ID attribute and button's form prop ✅ BEST
```jsx
<form id="signin-form" onSubmit={handleSignIn}>
  ...
</form>

<Button 
  type="submit" 
  form="signin-form"  ← Associate button with form by ID
  onClick={() => {
    document.getElementById('signin-form')?.requestSubmit();
  }}
/>
```

### Option 3: Use useRef to hold form reference
Create refs, attach to forms, call `formRef.current.requestSubmit()` on button click.

### Option 4: Move forms outside Tabs context
Restructure JSX to remove forms from TabsContent portal.

## Recommended Fix (Option 2)

Add form IDs:
```jsx
<form id="signin-form" onSubmit={handleSignIn}>
```

Update button:
```jsx
<Button 
  form="signin-form"
  type="submit" 
  className="w-full" 
  disabled={isLoading}
  onClick={() => {
    const form = document.getElementById('signin-form') as HTMLFormElement;
    if (form && !isLoading) form.requestSubmit();
  }}
>
  {isLoading ? 'Signing in...' : 'Sign In'}
</Button>
```

## Implementation Steps

1. Add IDs to forms: `signin-form`, `signup-form`, `reset-form`
2. Add `form="signin-form"` attribute to each button
3. Add `onClick` handler that calls `document.getElementById(...).requestSubmit()`
4. Test button clicks work
5. Verify Enter key still works

## Files to Update
- `src/pages/Auth.tsx` - Add form IDs and button handlers

## Testing
```bash
npm run test -- tests/verify-login-button-fix.spec.ts
```

Expected result: Button click + Enter key both submit form successfully

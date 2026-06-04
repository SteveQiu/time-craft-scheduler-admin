# Accessibility: Action Buttons (Edit / Delete)

## WCAG Requirements for Icon Buttons

### 1. Always Visible (Non-text Contrast — SC 1.4.11)
- Icon buttons **must** have ≥ 3:1 contrast ratio against background at all times
- **Never hide buttons behind hover** — users on touch devices, keyboard nav, or with motor impairments can't hover
- **Never use muted/faded colors** that fail contrast — icons must be clearly perceivable

### 2. Accessible Labels (SC 4.1.2)
- Every icon-only button needs `aria-label` (e.g., "Edit resource", "Delete resource")
- Screen readers cannot interpret icons alone

### 3. Touch Target Size (SC 2.5.5)
- Minimum 24×24px (AA), ideally 44×44px for touch
- Our `h-8 w-8` (32×32px) meets AA

### 4. Color Independence (SC 1.4.1)
- Don't rely solely on color to convey meaning
- Icons (Pencil, Trash) already convey action through shape ✓

### 5. Focus Visibility (SC 2.4.7)
- Keyboard-focused buttons must show visible focus ring
- Shadcn Button already handles this ✓

## Project Convention

```tsx
// ✅ CORRECT — always visible, accessible contrast, labeled
<Button variant="ghost" size="sm" aria-label="Edit resource">
  <Pencil className="h-3.5 w-3.5" />
</Button>
<Button variant="ghost" size="sm" aria-label="Delete resource">
  <Trash2 className="h-3.5 w-3.5" />
</Button>

// ❌ WRONG — hidden on hover, no aria-label
<Button className="opacity-0 group-hover:opacity-100">
  <Pencil />
</Button>

// ❌ WRONG — muted color fails contrast
<Button className="text-muted-foreground/60">
  <Pencil />
</Button>
```

## References
- [WCAG SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)
- [WCAG SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html)
- [WCAG SC 2.5.5 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)

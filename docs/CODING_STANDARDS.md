# Coding Standards & Best Practices

## Table of Contents
1. [File Organization](#file-organization)
2. [Component Structure](#component-structure)
3. [Code Quality Patterns](#code-quality-patterns)
4. [Performance Optimization](#performance-optimization)
5. [Common Patterns](#common-patterns)

---

## File Organization

### Directory Structure Principles

```
src/
├── pages/              # Full-page route components
│   ├── Auth.tsx       # Authentication page
│   ├── Dashboard.tsx  # Dashboard page
│   └── ...
├── components/        # Modular components
│   ├── ui/           # shadcn-ui primitives (DO NOT EDIT)
│   ├── Calendar.tsx  # Large feature component
│   ├── Workers/      # Feature folder (split complex features)
│   │   ├── WorkerList.tsx
│   │   ├── WorkerCard.tsx
│   │   └── useWorkerData.ts
│   └── AppSidebar.tsx
├── hooks/            # Custom React hooks
│   ├── useAuth.tsx
│   └── useOrgWorkers.ts
├── lib/              # Utility functions
│   └── utils.ts
└── integrations/     # External service integrations
    └── supabase/
```

### When to Split Files

**Keep in single file if:**
- Component is < 500 lines
- Only one or two related components
- Simple, focused logic

**Split to multiple files when:**
- Component exceeds 600 lines
- Contains multiple sub-components with distinct logic
- Has complex custom hooks
- Multiple features grouped together

**Example: Workers feature split**
```
components/Workers/
├── Workers.tsx           # Main container (fetches data, layout)
├── WorkerList.tsx       # List display logic
├── WorkerCard.tsx       # Individual worker card
├── WorkerForm.tsx       # Create/edit form
├── useWorkerActions.ts  # Custom hook for CRUD operations
└── types.ts            # TypeScript interfaces
```

---

## Component Structure

### File Organization Within Component

```typescript
// 1. Imports (organize: React → libraries → local)
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// 2. Type definitions
interface ComponentProps {
  title: string;
  onSubmit?: (data: FormData) => void;
}

interface FormData {
  name: string;
  email: string;
}

// 3. Constants (if any)
const DEFAULT_TIMEOUT = 5000;

// 4. Component definition
export function MyComponent({ title, onSubmit }: ComponentProps) {
  // State
  const [state, setState] = useState('');
  
  // Hooks (custom hooks after standard hooks)
  const { user } = useAuth();
  const { data } = useQuery({...});
  
  // Effects
  useEffect(() => {
    // logic
  }, []);
  
  // Handlers
  const handleClick = () => {
    // logic
  };
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

---

## Code Quality Patterns

### Time Formatting (Proper Way)

**❌ WRONG - String slicing:**
```typescript
{opening.start_time.slice(0, 5)}  // Fragile, not maintainable
```

**✅ RIGHT - Using toLocaleTimeString:**
```typescript
{new Date(`1970-01-01T${opening.start_time}`).toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})}
// Outputs: "10:00" instead of "10:00:00"
```

### Date/Time Handling

```typescript
// Format time without seconds
const formatTime = (timeString: string): string => {
  return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Use in JSX
{formatTime(opening.start_time)} - {formatTime(opening.end_time)}
```

### Conditional Rendering

**❌ WRONG - Unnecessary complexity:**
```typescript
{isLoading ? <LoadingSpinner /> : isError ? <ErrorMessage /> : <Content />}
```

**✅ RIGHT - Early returns:**
```typescript
if (isLoading) return <LoadingSpinner />;
if (isError) return <ErrorMessage />;
return <Content />;
```

### State Management

**❌ WRONG - Prop drilling:**
```typescript
<Parent>
  <Child1>
    <Child2>
      <Child3 data={data} />
    </Child2>
  </Child1>
</Parent>
```

**✅ RIGHT - Use Context or composition:**
```typescript
<DataProvider value={data}>
  <Parent>
    <Child1>
      <Child2>
        <Child3 /> {/* Child3 uses useData() hook */}
      </Child2>
    </Child1>
  </Parent>
</DataProvider>
```

### Naming Conventions

```typescript
// Components: PascalCase
function MyComponent() {}

// Variables/functions: camelCase
const myVariable = 'value';
function myFunction() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Event handlers: on + action
const handleSubmit = () => {};
const handleClick = () => {};

// Boolean flags: is/has prefix
const isLoading = false;
const hasError = false;
```

---

## Performance Optimization

### React.memo for Props

```typescript
// Only if component receives stable props or you optimize
const MyCard = React.memo(({ item, onDelete }: Props) => (
  <div onClick={() => onDelete(item.id)}>{item.name}</div>
));
```

### useMemo for Expensive Computations

```typescript
const groupedData = useMemo(() => {
  return data.reduce((acc, item) => {
    // expensive computation
    return acc;
  }, {});
}, [data]);
```

### useCallback for Event Handlers

```typescript
const handleDelete = useCallback((id: string) => {
  deleteItem(id);
}, []); // Add dependencies if needed
```

### Key Prop in Lists

```typescript
// ❌ WRONG - using index as key
{items.map((item, index) => <Item key={index} {...item} />)}

// ✅ RIGHT - use unique, stable identifier
{items.map((item) => <Item key={item.id} {...item} />)}
```

---

## Common Patterns

### Custom Hook Pattern

```typescript
// hooks/useWorkerData.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWorkerData(workerId: string) {
  return useQuery({
    queryKey: ['worker', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });
}
```

### Component with Sub-components

```typescript
// Good for related, tightly-coupled components
function Card({ children, title }) {
  return (
    <div>
      <Card.Header>{title}</Card.Header>
      <Card.Body>{children}</Card.Body>
      <Card.Footer />
    </div>
  );
}

Card.Header = ({ children }) => <div className="header">{children}</div>;
Card.Body = ({ children }) => <div className="body">{children}</div>;
Card.Footer = () => <div className="footer" />;

export { Card };

// Usage:
<Card title="My Card">
  <p>Content</p>
</Card>
```

### Async Data Fetching

```typescript
// ✅ Use React Query pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => fetchResource(id)
});

if (isLoading) return <Skeleton />;
if (error) return <ErrorComponent />;
return <ResourceView data={data} />;
```

### Form Handling

```typescript
const [formData, setFormData] = useState({ name: '', email: '' });

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await submitForm(formData);
    toast.success('Form submitted');
  } catch (error) {
    toast.error('Error submitting form');
  }
};
```

---

## Layout & UI Patterns

### Spacing Conventions

Use Tailwind spacing scale:
- `gap-1` = 4px (very tight)
- `gap-2` = 8px (default spacing between elements)
- `gap-3` = 12px (comfortable spacing)
- `gap-4` = 16px (section spacing)
- `gap-6` = 24px (major sections)

### Responsive Design

```typescript
// Mobile-first approach
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Single column on mobile, 3 columns on large screens */}
</div>
```

### Tooltips & Hints

```typescript
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

<Tooltip>
  <TooltipTrigger asChild>
    <Button><X /></Button>
  </TooltipTrigger>
  <TooltipContent>Remove opening</TooltipContent>
</Tooltip>
```

---

## Summary Checklist

- ✅ Split components > 600 lines into feature folders
- ✅ Use toLocaleTimeString for time formatting (not string slicing)
- ✅ Prefer useCallback/useMemo only when needed
- ✅ Use React Query for server state
- ✅ Keep components focused and single-responsibility
- ✅ Use TypeScript interfaces for props
- ✅ Add tooltips for icons-only buttons
- ✅ Use `gap-2` for default element spacing, `gap-4` for sections
- ✅ Organize imports: React → libraries → local
- ✅ Name event handlers with `handle` prefix

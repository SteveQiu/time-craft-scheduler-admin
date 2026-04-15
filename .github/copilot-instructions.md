# Copilot Instructions for Time Craft Scheduler Admin

## Overview

This is a React + TypeScript scheduler administration dashboard built with Vite, styled with Tailwind CSS and shadcn-ui components. It integrates with Supabase for authentication and data management.

## Build, Test & Lint

### Development

```bash
npm run dev
# Starts Vite dev server on http://localhost:8080
```

### Production Build

```bash
npm run build
# Creates optimized build in dist/

npm run build:dev
# Creates development build for debugging
```

### Linting

```bash
npm run lint
# ESLint checks all .ts and .tsx files
# Note: @typescript-eslint/no-unused-vars and react-refresh rules are relaxed
```

### Preview

```bash
npm run preview
# Serves the production build locally
```

## Architecture

### Core Stack

- **Vite** (dev server) with React plugin using SWC for fast compilation
- **TypeScript** with lenient config (noImplicitAny, noUnusedLocals disabled) for rapid development
- **React Router v6** for page routing
- **React Query** (@tanstack/react-query) for server state management
- **Supabase** for authentication (Google OAuth) and database operations
- **shadcn-ui** component library (extensive Radix UI primitive components)
- **Tailwind CSS** for styling with animation support

### Directory Structure

- `src/pages/` - Full page components (Auth, Dashboard, Settings, AdminReports, Profile, etc.)
- `src/components/` - Reusable UI components and page modules (AppSidebar, Dashboard, Calendar, Appointments, Workers, etc.)
- `src/components/ui/` - shadcn-ui primitive components (Button, Card, Dialog, Table, etc.)
- `src/hooks/` - Custom React hooks (useAuth, useUserRoles, useOrgWorkers, use-toast, use-mobile)
- `src/integrations/supabase/` - Supabase client and TypeScript types
- `src/lib/` - Utility functions (cn for className merging, etc.)
- `src/data/` - Static data or data constants

### Routing

React Router is configured in App.tsx with the following main routes:

- `/` or `/dashboard` - Main dashboard view
- `/calendar` - Calendar/openings view
- `/browse` - Browse available appointments
- `/workers` - Workers management
- `/appointments` - Appointments list and management
- `/appointments/:id` - Single appointment detail view
- `/openings/:id` - Single opening detail view
- `/auth` - Authentication page
- `/settings` - Settings page
- `/profile` - User profile page
- `/admin/reports` - Admin reports view
- `*` - 404 Not Found page

### Authentication & Authorization

**useAuth Hook:**
- Manages Supabase Auth state (Google OAuth)
- Provides `user`, `session`, `signInWithGoogle`, `signOut`, and `loading` state
- Has development mode bypass for lovable.dev domain (mock user)
- Wraps entire app in App.tsx via AuthProvider

**useUserRoles Hook:**
- Determines user type: `isUser`, `isOrganization`, `isInternalDev`
- Used to conditionally show UI elements in AppSidebar and page components
- Controls view modes ("user" or "org")

**Profile Management:**
- User full_name stored in Supabase `profiles` table
- Fetched and displayed in AppSidebar when available

### Component Patterns

**UI Components:**
- All shadcn-ui components are pre-generated in `src/components/ui/`
- Use the `cn()` utility from `src/lib/utils` to merge Tailwind classes
- Components accept className prop for customization

**Page vs Component:**
- Pages (in `src/pages/`) represent full routes
- Components (in `src/components/`) are modular and reusable
- Dashboard, Calendar, BookingBrowse, Workers, Appointments are full-page modules

**Toast/Notification System:**
- Two toast providers: `Sonner` (modern) and shadcn-ui `Toaster`
- useToast hook available in `src/hooks/use-toast.ts`
- Use Sonner for most notifications (better UX)

### State Management

- **React Query:** For async server state (appointments, workers, openings)
- **React Context:** For global state like auth (useAuth), user roles (useUserRoles)
- **Component State:** Local state with useState for UI (modals, filters, view mode)
- **React Router:** For URL-based state (viewing specific appointments/openings)

## Key Conventions

### Path Aliases

- Use `@/` alias for imports from src directory (configured in vite.config.ts and tsconfig.json)
- Example: `import { Button } from '@/components/ui/button'`

### Component Development Mode

- When running locally or in development mode, Lovable-tagger component tagging is enabled
- This helps with component tracking but doesn't affect functionality

### Tailwind + shadcn-ui

- All components use Tailwind CSS for styling
- Use `cn()` utility to conditionally merge class names
- Follow shadcn-ui patterns for component composition (props drilling, etc.)
- Common utilities: `flex`, `gap`, `px`, `py`, `rounded`, `shadow`, `border`

### TypeScript Configuration

- `strictNullChecks: false` and `noImplicitAny: false` for flexibility
- No strict unused variable checking (helpful during development)
- This is intentional for rapid prototyping in a Lovable project

### Supabase Integration

- Client initialized in `src/integrations/supabase/client.ts`
- TypeScript types generated and stored in `src/integrations/supabase/types.ts`
- Use `supabase` client directly: `supabase.from('table').select().then(...)`
- For Google OAuth redirects, uses `window.location.origin` dynamically
- Auth state changes emit events (SIGNED_IN, SIGNED_OUT, etc.)

### React Query Setup

- QueryClient initialized in App.tsx
- Provides caching and synchronization for server data
- Use with hooks for easier async state management

### View Modes

- AppSidebar supports switching between 'user' and 'org' view modes
- URL params can indicate mode: `/calendar?mode=user` or `/calendar?mode=org`
- Different UI and features shown based on isUser, isOrganization, isInternalDev checks

## Environment Setup

- Node.js required (npm or bun)
- `.env` file should contain Supabase configuration (API URL, Anon Key)
- Dev server runs on `::` (IPv6) on port 8080

## Coding Standards

See `docs/CODING_STANDARDS.md` for comprehensive best practices including:
- File organization and when to split components
- Component structure and naming conventions
- Code quality patterns (time formatting, state management, etc.)
- Performance optimization techniques
- UI/Layout patterns and spacing conventions

## Common Tasks

### Adding a New Page

1. Create component in `src/pages/` or as a module in `src/components/`
2. Add route in `src/App.tsx`
3. Import and link from `src/components/AppSidebar.tsx` if needed

### Creating UI Components

- Use shadcn-ui components from `src/components/ui/`
- Compose them with custom logic
- Example: wrap Button with custom styling or interactivity

### Fetching Data from Supabase

```typescript
import { supabase } from '@/integrations/supabase/client';

// Direct query
const { data, error } = await supabase
  .from('appointments')
  .select('*')
  .eq('user_id', userId);

// With React Query for better UX
const { data, isLoading } = useQuery({
  queryKey: ['appointments', userId],
  queryFn: () => supabase.from('appointments').select('*').eq('user_id', userId),
});
```

### Using Toast Notifications

```typescript
import { useToast } from '@/hooks/use-toast';
// Or use Sonner directly:
import { toast } from 'sonner';

toast.success('Action completed!');
// or
toast.error('Something went wrong');
```

## Deployment

Project is built with Lovable and can be deployed via Lovable's publish feature or as a standard Vite build.

- Build output: `dist/` directory
- Use `npm run build` for production
- Supabase configuration must be set in environment

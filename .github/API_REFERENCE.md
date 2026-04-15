# API & Integration Reference

Quick reference for APIs, hooks, and external integrations.

---

## Supabase Client

### Location
```typescript
import { supabase } from '@/integrations/supabase/client'
```

### Basic Operations

**Query**
```typescript
const { data, error } = await supabase
  .from('appointments')
  .select('*')
  .eq('student_id', userId)
  .order('created_at', { ascending: false })
```

**Insert**
```typescript
const { data, error } = await supabase
  .from('appointments')
  .insert([{ opening_id, student_id }])
```

**Update**
```typescript
const { data, error } = await supabase
  .from('appointments')
  .update({ status: 'confirmed' })
  .eq('id', appointmentId)
```

**Call RPC (stored procedure)**
```typescript
const { data, error } = await supabase.rpc('book_opening', {
  _opening_id: openingId,
  _student_id: studentId
})
```

---

## React Query Integration

### Setup
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

// Wrap app with provider
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### Using Queries
```typescript
import { useQuery } from '@tanstack/react-query'

function MyComponent() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['appointments', userId],
    queryFn: () => supabase
      .from('appointments')
      .select('*')
      .eq('student_id', userId),
    staleTime: 1000 * 60 * 5,  // 5 minutes
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  return <div>{data?.length} appointments</div>
}
```

### Using Mutations
```typescript
import { useMutation } from '@tanstack/react-query'

function BookAppointment() {
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: (openingId) => supabase.rpc('book_opening', {
      _opening_id: openingId,
      _student_id: userId
    }),
    onSuccess: () => {
      // Refetch appointments after booking
      queryClient.invalidateQueries(['appointments'])
    }
  })

  return (
    <button onClick={() => mutation.mutate(openingId)}>
      Book
    </button>
  )
}
```

---

## Custom Hooks

### useAuth
**Purpose:** Manage authentication state

```typescript
import { useAuth } from '@/hooks/useAuth'

function Component() {
  const { user, session, loading, signInWithGoogle, signOut } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <button onClick={signInWithGoogle}>Sign In</button>
  
  return <div>Welcome, {user.email}</div>
}
```

**Properties:**
- `user` - Current user object (or null)
- `session` - Auth session (or null)
- `loading` - True while checking auth
- `signInWithGoogle()` - Start OAuth flow
- `signOut()` - Sign out user

---

### useUserRoles
**Purpose:** Get user type (individual, organization, internal dev)

```typescript
import { useUserRoles } from '@/hooks/useUserRoles'

function Component() {
  const { isUser, isOrganization, isInternalDev } = useUserRoles()

  if (isOrganization) return <OrgDashboard />
  if (isUser) return <UserDashboard />
  return <div>Unknown role</div>
}
```

---

### useToast
**Purpose:** Show notifications

```typescript
import { useToast } from '@/hooks/use-toast'

function Component() {
  const { toast } = useToast()

  function handleClick() {
    toast({
      title: 'Success!',
      description: 'Appointment booked',
      duration: 3000
    })
  }

  return <button onClick={handleClick}>Book</button>
}
```

---

## Authentication

### Google OAuth Flow

**Setup in Supabase:**
1. Go to Supabase → Authentication → Providers
2. Enable Google
3. Add OAuth credentials
4. Configure redirect URL (usually `http://localhost:8080`)

**Usage:**
```typescript
const { user, signInWithGoogle } = useAuth()

// Sign in
await signInWithGoogle()

// Check if signed in
if (user) console.log('Logged in as:', user.email)
```

**Development Mode:**
- lovable.dev domain bypasses OAuth for testing
- Mock user is used locally

---

## React Router

### Routes
```typescript
// In App.tsx
const routes = [
  { path: '/', element: <Dashboard /> },
  { path: '/calendar', element: <Calendar /> },
  { path: '/browse', element: <BookingBrowse /> },
  { path: '/browse/:providerId', element: <BookingBrowse /> },
  { path: '/appointments', element: <Appointments /> },
  { path: '/openings/:id', element: <OpeningView /> },
  { path: '/workers', element: <Workers /> },
]
```

### Navigation
```typescript
import { useNavigate } from 'react-router-dom'

function Component() {
  const navigate = useNavigate()

  return (
    <button onClick={() => navigate('/calendar')}>
      Go to Calendar
    </button>
  )
}
```

### URL Parameters
```typescript
import { useParams } from 'react-router-dom'

function OpeningDetail() {
  const { id } = useParams()  // Get 'id' from /openings/:id
  return <div>Opening: {id}</div>
}
```

---

## Component Libraries

### shadcn/ui
**Pre-installed components:**
- Button, Card, Dialog, Input, Select, Table
- All in `src/components/ui/`

**Usage:**
```typescript
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function Component() {
  return (
    <Card>
      <Button>Click me</Button>
    </Card>
  )
}
```

### Tailwind CSS
**Utility-first CSS framework**

```typescript
<div className="flex gap-4 p-4 rounded-lg shadow-md">
  <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
    Click
  </button>
</div>
```

---

## Error Handling

### Try/Catch Pattern
```typescript
async function fetchData() {
  try {
    const { data, error } = await supabase
      .from('openings')
      .select('*')
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to fetch:', error)
    toast.error('Failed to load data')
  }
}
```

### React Query Error Handling
```typescript
const { data, error } = useQuery({
  queryKey: ['appointments'],
  queryFn: fetchAppointments,
  onError: (error) => {
    toast.error('Failed to load appointments')
  }
})
```

---

## Deployment Environment Variables

**Required in `.env`:**
```env
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

**Optional:**
```env
VITE_API_URL=http://localhost:3000  # If using separate API
```

**In Vercel/Netlify:**
- Add these variables to deployment settings
- Never commit `.env` to git

---

## Common API Patterns

### Fetch Appointments with Join
```typescript
const { data: appointments } = await supabase
  .from('appointments')
  .select(`
    id,
    status,
    created_at,
    openings (
      date_time,
      duration_minutes
    ),
    profiles:student_id (
      full_name
    )
  `)
  .eq('tutor_id', tutorId)
```

### Filter by Date Range
```typescript
const { data: openings } = await supabase
  .from('openings')
  .select('*')
  .gte('date_time', startDate)
  .lt('date_time', endDate)
  .eq('is_available', true)
```

### Count Results
```typescript
const { count } = await supabase
  .from('appointments')
  .select('*', { count: 'exact' })
  .eq('student_id', userId)
```

---

## Performance Optimization

### Query Caching
```typescript
// React Query caches for 5 minutes by default
const { data } = useQuery({
  queryKey: ['appointments'],
  queryFn: fetchAppointments,
  staleTime: 1000 * 60 * 5,  // 5 minutes
  cacheTime: 1000 * 60 * 10,  // 10 minutes (cache duration)
})
```

### Manual Refetch
```typescript
const queryClient = useQueryClient()

// Force refetch
queryClient.invalidateQueries(['appointments'])

// Or refetch without invalidating
const { refetch } = useQuery(...)
refetch()
```

### Pagination
```typescript
const [page, setPage] = useState(1)

const { data } = useQuery({
  queryKey: ['appointments', page],
  queryFn: () => fetchAppointments(page),
})
```

---

## Debugging

### Check Supabase Connection
```typescript
const { data, error } = await supabase.from('profiles').select('id').limit(1)
console.log('Supabase test:', { data, error })
```

### Check Query Caches
```typescript
const queryClient = useQueryClient()
console.log('Cache:', queryClient.getQueryCache().getAll())
```

### Monitor Network
```bash
# In browser DevTools
F12 → Network tab → Filter by "API"
# See all requests/responses
```

---

**Last Updated:** 2026-04-15
**Stack:** React Query + Supabase + React Router
**Status:** Production

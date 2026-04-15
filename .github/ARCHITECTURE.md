# Project Architecture & Design Decisions

## Project Overview

**time-craft-scheduler-admin** - A React/TypeScript admin dashboard for managing tutoring services where:
- **Tutors** create opening slots (availability)
- **Students** browse and book tutors
- **System** manages appointments and prevents double-booking

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 + TypeScript | Type-safe UI with hooks |
| **Build Tool** | Vite | Fast dev server, quick HMR |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development |
| **Router** | React Router v6 | Modern routing with outlets |
| **State** | React Query + Context | Server + global state |
| **Backend** | Supabase | Auth + PostgreSQL + RLS |
| **Testing** | Playwright | End-to-end validation |

---

## Core Architecture

### Database Schema

**Key Tables:**
- `profiles` - User info (email, full_name)
- `openings` - Tutor availability slots
- `appointments` - Bookings (pending/confirmed/cancelled)
- `audit_log` - Changes tracked automatically

**Key Relationships:**
```
profiles (1) ←→ (many) openings
openings (1) ←→ (many) appointments
appointments (many) ←→ (1) profiles (student + tutor)
```

**Critical Constraints:**
- Opening marked `is_available = false` when first pending appointment created
- Only pending appointment allowed per opening (prevents double-booking)
- Tutor can only create openings in future
- Student can only book available openings

### Component Architecture

**Page Structure:**
```
App.tsx (routing)
├── /dashboard        → Dashboard page
├── /calendar         → Calendar (create openings)
├── /browse           → Browse tutors
│   ├── BrowseList    → List view
│   └── BrowseDetail  → Detail view (split to avoid hooks violation)
├── /appointments     → Appointments list
├── /openings/:id     → Opening detail
└── /workers          → Workers management
```

**Key Pattern - Component Splitting:**
- `BookingBrowse.tsx` - List view only
- `BrowseDetail.tsx` - Detail view only (extracted to follow React hooks rules)
- Each component owns its own hooks/state
- Never conditional hooks!

### State Management

**React Query (Server State):**
```typescript
// Cache appointments by user/provider
useQuery(['appointments', userId])
useQuery(['openings', providerId])
```

**React Context (Global State):**
```typescript
// Auth state
useAuth() → { user, session, loading }

// User roles
useUserRoles() → { isUser, isOrganization, isInternalDev }
```

**Component State (Local):**
```typescript
// Modals, filters, form inputs
const [isOpen, setIsOpen] = useState(false)
```

---

## Key Design Patterns

### 1. Component Splitting (Hooks Rule Compliance)

**Problem:** Component with conditional logic causes different hook counts

**Solution:** Split into separate components

```typescript
// ❌ WRONG
function Browse({ id }) {
  if (id) const [detail] = useState();  // Conditional hook!
  const [list] = useState();
}

// ✅ RIGHT
function Browse({ id }) {
  return id ? <BrowseDetail /> : <BrowseList />;
}
```

**Applied in:** BookingBrowse + BrowseDetail

---

### 2. Atomic Database Transactions

**Problem:** Race condition - multiple users booking same slot

**Solution:** Mark opening unavailable in same transaction as appointment

```sql
-- Updated RPC: book_opening()
BEGIN;
INSERT INTO appointments (...) VALUES (...);
UPDATE openings SET is_available = false WHERE id = _opening_id;
COMMIT;
```

**Why:** Prevents other users from seeing the slot after first booking

---

### 3. Timezone-Safe Date Handling

**Problem:** `new Date("2026-05-01")` uses UTC, shifts based on local timezone

**Solution:** Parse manually to local timezone

```typescript
// ❌ WRONG
const date = new Date("2026-05-01");  // UTC!

// ✅ RIGHT
const [year, month, day] = "2026-05-01".split('-').map(Number);
const date = new Date(year, month - 1, day);  // Local!

// Use getDate(), getMonth(), not toISOString()
```

**Applied in:** Calendar.tsx date parsing

---

### 4. Calendar Date Range Iteration

**Problem:** `for` loop with `setDate()` breaks (returns timestamp)

**Solution:** Use `while` loop with separate increment

```typescript
// ❌ WRONG
for (let d = start; d.setDate(...))  // setDate() returns timestamp!

// ✅ RIGHT
let d = new Date(start);
while (d <= end) {
  // process d
  d.setDate(d.getDate() + 1);
}
```

**Applied in:** Calendar.tsx multi-date opening creation

---

## Data Flow Examples

### Creating Opening (Calendar)
```
User selects dates/times
     ↓
Calendar.tsx validates
     ↓
POST to Supabase RPC create_opening
     ↓
Database creates N rows (one per slot)
     ↓
React Query refetch invalidates cache
     ↓
Calendar refreshes
```

### Booking Appointment (Browse → Openings)
```
User clicks "Book This"
     ↓
OpeningView.tsx calls book_opening RPC
     ↓
Database: 
  1. INSERT appointment (pending)
  2. UPDATE opening (is_available = false)
     ↓
Other users see slot unavailable
     ↓
React Query cache updates
```

### Browse Tutors (BrowseList → BrowseDetail)
```
BrowseList shows all services
     ↓
User clicks tutor name
     ↓
URL changes to /browse/{providerId}
     ↓
BrowseDetail component mounts (separate component!)
     ↓
Fetches provider's workers + openings
     ↓
Calendar shows available dates
     ↓
User clicks date → sees available times
```

---

## Critical Files & Their Purposes

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/components/BrowseDetail.tsx` | Provider detail view | Separate component to avoid hooks violation |
| `src/components/Calendar.tsx` | Opening creation | Multi-date with proper while loop |
| `src/components/BookingBrowse.tsx` | Provider list | Clean list view, delegates detail |
| `src/integrations/supabase/` | Database client | Auth + RLS enforcement |
| `.github/copilot-debugging-skill.md` | Quick debugging ref | 6-step cycle |

---

## Performance Considerations

**Query Optimization:**
- Browse page makes 3 queries (openings, pending appointments, providers)
- Could optimize to 1 via database view (future improvement)
- React Query caching prevents redundant fetches

**Rendering:**
- Components split to prevent unnecessary re-renders
- Memoization used for expensive computations

**Database:**
- Performance indexes added on `appointments` table
- RLS policies enforce security without additional app logic

---

## Known Limitations & Future Improvements

1. **Browse Query** - Currently 3 queries, could be 1
2. **Audit Trail** - Migration created but not yet applied
3. **Performance Indexes** - Migration created but not yet applied
4. **UI State** - Some modals could use URL params for shareable links
5. **Real-time** - No real-time updates (uses polling via React Query)

---

## Deployment

**Build:**
```bash
npm run build  # Creates dist/
```

**Environment:**
- `.env` needs Supabase API URL + Anon Key
- Dev server: `http://localhost:8080`
- Production ready for any hosting

---

**Last Updated:** 2026-04-15
**Key Decision Maker:** Copilot + User feedback
**Status:** Production ready

### 2026-05-06: Rate lookup via SECURITY DEFINER RPC
**By:** SteveQiu (via Dallas)
**What:** Replace direct openings/profiles queries with `get_appointment_rates` RPC. Customers get 0 rows from those tables due to RLS. The SECURITY DEFINER function bypasses RLS server-side while still enforcing ownership in WHERE clause.
**Why:** Customers were seeing "Free" for all appointments because RLS blocked rate lookups.

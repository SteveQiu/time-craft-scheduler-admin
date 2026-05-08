# Ripley — Project History

## Project Context

**Project:** time-craft-scheduler-admin
**Stack:** React 18, TypeScript, Tailwind CSS, Shadcn/ui, Supabase
**Joined:** 2026-05-08 (replaced Dallas)
**Requested by:** SteveQiu

## Day-1 Context

App is an admin scheduler for organizations. Key pages: Appointments, Workers, Browse.

**Critical files:**
- `src/components/Appointments.tsx` — paid button logic, cash detection, payment proof upload/display
- `src/components/Workers.tsx` — workers management; contact fields removed (uses org contact)

**Key architectural decisions to respect:**
- `paidAppointmentIds` query: `select('appointment_id, photo_url')` — NEVER add columns, NEVER merge with other queries
- Payment method type: separate independent `useQuery` — failure is cosmetic, never structural
- Cash payments: brown-orange border theme (`border-orange-800 text-orange-800`)
- Photo proof storage: Supabase Storage bucket `payment-proofs`, URL stored in `photo_url` column

**DB schema (payment_proofs):**
- `appointment_id`, `customer_id`, `note`, `photo_url` (Storage URL, not base64), `created_at`, `updated_at`

**Team:**
- Ralph (QA): verifies all Ripley's work in browser — required before any task is closed
- Bishop (UX): accessibility and design authority — directives are binding
- Guardian: secret scanning

## Learnings

### Signed URLs for Private Supabase Storage Buckets (2026)

`payment-proofs` bucket is private — `getPublicUrl()` returns a 403-prone URL. Fix:
- **Upload**: store storage `filePath` (e.g. `userId/appointmentId-ts.jpg`) in `photo_url`, not the public URL.
- **Display**: call `supabase.storage.from('payment-proofs').createSignedUrl(path, 3600)` and use `data.signedUrl` as `<img src>`.
- **Backward compat**: `extractProofStoragePath()` helper strips old full public URLs down to the storage path before signing.
- **Pattern**: signed URL generation goes in a `useEffect` watching the `photo_url` value; signed URL state cleared on dialog close + `proofImageError` reset.

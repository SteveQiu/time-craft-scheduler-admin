# Dallas History

## Learnings

### Media Gitignore Patterns & File Type Research (2026-05-14)
- **Research completed:** Video codecs (H.264, VP9, AV1), audio codecs (MP3, WAV, FLAC, OPUS), container formats (MP4, WebM, MOV, MKV), cache patterns
- **Key findings:**
  - H.264 MP4 @ 1080p30fps: ~40-60 MB per minute; fast regen (2-5 sec/min) — safe to ignore
  - VP9 @ 1080p30fps: ~22-45 MB per min; slow regen (10-20 sec/min) — always ignore
  - AV1 @ 1080p30fps: ~11-22 MB per min; very slow regen (>30 sec/min) — always ignore
  - TTS audio (MP3): ~1 MB per minute; instant regen from API — safe to ignore
  - Remotion cache: 100-500 MB; auto-regs on build — always ignore
- **Audit result:** Media folder contains 7 MP3 files, 2 MP4 files, no files >10MB (gitignore working)
- **Decision matrix created:** Source vs output, regeneration cost vs file size, team workflow checklist
- **Skill doc created:** `.squad/skills/media-gitignore-patterns/SKILL.md` with 14.7 KB comprehensive reference covering 9 sections

### Contact email visibility in appointment context
- `get_public_profile_by_id` RPC gates email behind `email_public` flag (default false), so `booker_email` / `provider_email` were always null.
- Fix: replaced both N×RPC calls with a single `.from('profiles').select('id, email, phone').in('id', allContactIds)` query.
- `profiles` table has `email` and `phone` in generated types (`src/integrations/supabase/types.ts`) — direct query works at type level with zero errors.
- One combined `contactMap` for both bookers and providers is simpler and faster (1 query vs N RPC calls).
- RLS may still block this at runtime if policies restrict profile reads — if so, a new RPC with `SECURITY DEFINER` will be needed.

### RLS did block cross-user profile reads (2026-05-13)
- Confirmed: direct `.from('profiles').in('id', ids)` returns empty rows for other users — RLS self-read policy is the culprit.
- Fix: `get_appointment_contact_info(profile_ids uuid[])` SECURITY DEFINER RPC. Guard: only returns profiles the caller shares an appointment with OR their own profile.
- `useAppointments.ts` now calls `supabase.rpc('get_appointment_contact_info', { profile_ids: allContactIds })`.
- Type registered in `src/integrations/supabase/types.ts` Functions block.
- Migration: `supabase/migrations/20260513_get_appointment_contact_info.sql` — must be applied manually via Supabase SQL editor (see `.squad/decisions/inbox/dallas-rls-migration-manual.md`).

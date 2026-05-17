# Squad Decisions

## User Directives

### 2026-05-06T11-42-12: Markdown artifact placement
**By:** SteveQiu (via Copilot)

AI-generated/supplementary markdown files must NOT be at repo root. Use `.github/` for GitHub/process docs, or `docs/` for project documentation. Keeps repo root clean.

### 2026-05-06T10:32: Lessons learned after bugs
**By:** SteveQiu (via Copilot)

After task involving bugs/mistakes, update affected agents' `history.md` with lessons learned. Example: refactoring imports requires verifying ALL usages of removed symbols, not just direct replacements (Settings blank-page bug from removing Edit/Trash2 icons during payment refactor).

### 2026-05-07T19:03:10: Bishop promoted to Frontend Conduct Authority over Dallas
**By:** User (via Copilot)

Bishop's role expanded from UX advisor to binding conduct authority over Dallas's frontend coding practices. Bishop can correct, discipline, and escalate repeat offenses. Dallas's charter updated to acknowledge dual supervision (Ralph for QA, Bishop for frontend practice). Dallas has repeatedly shipped sloppy code, self-certified broken work, and ignored known failure patterns. Bishop now has explicit authority to name bad practices, issue corrective directives, and escalate to coordinator for lockout on repeat offenses.

### 2026-05-07T18:15:00: Dallas Requires Independent QA Verification
**By:** Coordinator (user directive)

Ralph (QA & Tester) must independently verify all Dallas frontend changes before work accepted done. Coordinator never trusts Dallas self-certification — "tsc passes" and "build passes" necessary but not sufficient. Ralph's verification checklist: page not blank, existing features intact, new feature works in browser. Dallas and Ralph always spawned together for frontend tasks. Permanent rule, applies to all future Dallas work regardless of feature. Dallas's pattern: declared work done while broken (Appointments.tsx twice queried non-existent DB columns, broke paid buttons, only user caught it).

### 2026-05-07T21:54:45: Use LemonSqueezy for subscription/payment processing
**By:** SteveQiu (via Copilot)

User request: integrate LemonSqueezy for premium tier subscription and payment processing. Captured for team memory.

### 2026-05-08T00:00:00: Dallas retired, Ripley hired
**By:** SteveQiu (via Squad Coordinator)

Dallas retired due to repeated critical failures (banned from Appointments.tsx, broke paid buttons twice, unreliable self-certification). Replaced by Ripley — same frontend scope, clean record, no restrictions. Dallas's supervision overhead (dual overseers, file ban) cost more than contribution. Dallas archived to `.squad/agents/_alumni/dallas/`. Bishop's conduct authority role removed — no longer needed.

### 2026-05-12T15:30Z: Refund policy: all sales final
**By:** SteveQiu  
**What:** Canonical directive — all sales FINAL. NO refunds. Business decision for LemonSqueezy Premium subscriptions. Overrides earlier "7-day money-back" template.

### 2026-05-12: Legal pages audit + rewrite
**By:** Burke (Legal Counsel)  
**Scope:** Refund.tsx, Terms.tsx rewrite + Privacy.tsx verification  

**Changes:**
- Refund.tsx: removed 7-day guarantee, added "All Sales Final" lead, statutory carve-outs (EU/UK/AU), subscription cancellation guidance, billing disputes, ToS termination clause
- Terms.tsx Section 5: added non-refundable clause + Lemon Squeezy merchant link; Section 4: added prohibited biz categories (weapons, adult, gambling); Section 7: added DMCA takedown contact
- Privacy.tsx: no changes, consistent with Terms/Refund contact

**Build:** tsc passes, zero errors

**Flags for Hicks:** Settings → Subscription route exists but NO cancel button implemented; support@pikappoint.com monitoring unverified

### 2026-05-12: Legal fact-check report
**By:** Hicks (Legal Fact-Checker)  
**Verdict:** ❌ **REJECT** — 3 blocking issues + 4 non-blocking findings

**Blocking issues:**

1. **Refund.tsx Section 2 — EU/UK withdrawal wording INVALID** (lines 40-41)
   - Current: passive "you may waive" language
   - Required: explicit **prior express consent** + **acknowledgment of right loss** mechanism per Directive 2011/83/EU Article 16(m) and UK CCR 2013 Regulation 37
   - Fix: Ripley apply corrected text (see hicks-factcheck-2026-05-12.md lines 220-224)

2. **Refund.tsx Section 3 — cancellation UX mismatch** (line 58)
   - Text: "To cancel, navigate to: Settings → Subscription"
   - Reality: SubscriptionTab exists but has NO cancel button
   - Options: (a) add cancel button to SubscriptionTab, (b) link to Lemon Squeezy portal, (c) route through support@pikappoint.com
   - Recommendation: (b) or (c) safest until UX built

3. **Terms.tsx Section 5 — contradicts Lemon Squeezy Buyer Terms** (line 67)
   - Current: "All subscription purchases are final and non-refundable"
   - Issue: Lemon Squeezy terms allow discretionary refunds; PikAppoint cannot be stricter than merchant-of-record
   - Fix: Change to "non-refundable except where required by law or at Lemon Squeezy's sole discretion as merchant of record"

**Non-blocking (approve-with-fixes):**
- Privacy.tsx analytics disclosure vs codebase (claims tools but none installed; either remove or clarify "may add in future")
- Terms.tsx liability cap vague (payment disputes = Lemon Squeezy responsibility, clarify split)
- Privacy.tsx children's age: GDPR default 16 vs US COPPA 13 (clarify market)

**Unverifiable:** support@pikappoint.com staffing/monitoring

**Sources:** Directive 2011/83/EU Article 16(m), UK CCR 2013 Regulation 37, ACL s 54-56/60 (verified accurate), Lemon Squeezy Buyer Terms, GDPR Articles 12/15-21

**Next:** Ripley applies text fixes (mechanical). Ralph or Bishop adds cancel button to SubscriptionTab. Steve makes Open Questions calls on analytics/age/email.

### 2026-05-12: Legal pages template
**By:** Ripley  
**Scope:** Terms.tsx, Privacy.tsx, Refund.tsx created + routes wired

**Structure:** Shadcn Card, ~600-1000 words/page, GDPR-aware, subscription model (7-day refund first-time only, no proration), Supabase + Lemon Squeezy disclosures, contact: support@pikappoint.com

**Files:** 3 new legal pages, routes.ts + App.tsx + Auth.tsx modified

**Status:** Template-quality. Top comment TODO: lawyer review before jurisdictional reliance.

**Result:** Burke reviewed, found issues; Hicks issued REJECT per blocking concerns (see above).

### 2026-05-12: Calendar useEffect blocks QA
**By:** Ralph (QA & Tester)  
**Issue:** Calendar.tsx infinite useEffect loop + Supabase fetch failures block E2E testing

**Evidence:**
- Console: "Maximum update depth exceeded"
- Console spam: "Error loading openings: TypeError: Failed to fetch" (25+ times)
- Page unresponsive; "Add Opening" button disabled (`!user` check)
- Cannot verify total refactor E2E

**Decision:** Block QA sign-off until Ripley debugs Calendar.tsx:31 useEffect

**Impact:** Total refactor cannot be verified E2E; manual test fallback only.

**Owner:** Ripley

### 2026-05-12: Supabase auth broken
**By:** Ralph (QA & Tester)  
**Issue:** `signInWithPassword` fails with `TypeError: Failed to fetch` in E2E test; blocks ALL testing

**Evidence:** Playwright test, Supabase API call at `_handleRequest2`, test user qylsteveq@gmail.com cannot authenticate

**Possible causes:**
1. Corporate proxy/firewall blocking Supabase API (`https://dbabjfydcllqbjpolhym.supabase.co`)
2. Supabase service outage
3. Missing env vars after dev server restart (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
4. CORS (unlikely in dev)

**Actions:**
1. Manual test: http://localhost:8080, sign-in with qylsteveq@gmail.com / Soulreap1, check console
2. Verify env vars loaded (`curl` Supabase API)
3. Restart `npm run dev` if missing

**Status:** 🔴 BLOCKING — E2E tests cannot run

**Owner:** Ripley (Supabase integration debugging)

### 2026-05-08: Per-user subscriptions only
**By:** Steve (via Copilot)

Subscriptions are per-user only. No org-level plan column. `subscriptions` table (linked to profiles) is the single source of truth for premium status. `orgs.plan` column not used.

**Why:** User decision — orgs are also users in this app. Individual subscription model is simpler.

### 2026-05-12: Legal pages + cancel UX final pass (Hicks APPROVE + Ralph 7/7 pass)
**By:** Scribe (merging squad cycle)

**Outcome:** Hicks APPROVED all 3 blocking fixes. Ralph: 7/7 legal page tests pass. Cancel button code reviewed; runtime QA deferred due to auth timeout.

**Final state:**
- Refund.tsx: EU/UK withdrawal text explicit (prior consent + acknowledgment per Directive 2011/83/EU Art 16(m) + UK CCR 2013 Reg 37). Primary source URLs: https://www.legislation.gov.uk/uksi/2013/3134/regulation/37/made, EU Directive 2011/83/EU Art 16(m)
- Terms.tsx §5: "non-refundable except where required by law or at Lemon Squeezy's sole discretion as merchant of record". Matches https://www.lemonsqueezy.com/buyer-terms
- SubscriptionTab.tsx: Cancel button + AlertDialog. Opens VITE_LEMONSQUEEZY_PORTAL_URL (graceful disabled + "contact support" if unset). Dialog: "Cancel Premium Subscription?" / "keep access until period ends, no refunds"
- Auth.tsx: signup checkbox links to /terms /privacy /refund (3 links)
- Bishop cancel UX spec: `AlertDialog` title exact, description exact, button labels exact ("Keep Premium" default-focused, "Yes, Cancel Subscription" destructive), 44px touch targets, mobile stack vertical
- Ralph test results: 7/7 legal pages pass (desktop + mobile + signup links). Cancel button tests: 5/5 skipped (auth timeout blocked Settings access). False-block lesson: pipe truncation killed dev server on pass 1; fixed in pass 2 (no piping, shellId async, stable vite)
- Open: env var VITE_LEMONSQUEEZY_PORTAL_URL to set in production; manual cancel button QA needed (test account auth issue unresolved)

**Team:**
- Bishop (UX): wrote `bishop-cancel-ux-2026-05-12.md` (prescriptive spec)
- Ripley (FE): applied Hicks fixes + Bishop spec
- Hicks (Legal): fact-check pass 2 APPROVED (blocked Burke after pass 1 REJECT)
- Ralph (QA): verified legal pages 7/7, deferred cancel UX due to auth blocker
- Burke (Legal): locked out per Reviewer Rejection Protocol after pass 1 REJECT

### 2026-05-12: Cancel subscription UX — Bishop spec + Ripley implementation + Hicks approval
**By:** Bishop → Ripley → Hicks → approved

**Button spec:** SubscriptionTab.tsx, after status line, outline variant, "Cancel Subscription" label, min-h-[44px]. Disabled + helper text when VITE_LEMONSQUEEZY_PORTAL_URL missing.

**Dialog spec:**
- Title: "Cancel Premium Subscription?"
- Description: "Cancellation takes effect at the end of your current billing period. You will keep Premium access until then. No refunds or prorated credits will be issued."
- Cancel btn: "Keep Premium" (default focus, outline)
- Action btn: "Yes, Cancel Subscription" (destructive red)
- On confirm: `window.open(VITE_LEMONSQUEEZY_PORTAL_URL, '_blank')` → toast: "Premium cancellation portal opened. Complete the process there." + "Your subscription status will update here once Lemon Squeezy processes the cancellation."
- No local state change on confirm; wait for webhook

**A11y:** Radix AlertDialog auto-handles focus trap, title/description announced, Escape closes, 44px+ touch targets, dark mode support

**Implementation:** `src/pages/settings/SubscriptionTab.tsx` lines 57-82. AlertDialog imported, handler skeleton provided by Bishop. Env var read at component render time; graceful disable if missing.

**Hicks verdict:** Accepted. Refund.tsx claim "To cancel, navigate to: Settings → Subscription" now accurate. Cancel button implemented, portal URL env var required for production.

### 2026-05-12: Lemon Squeezy customer portal URL pattern
**By:** Ripley (decision, Hicks approved)

**Pattern:** `VITE_LEMONSQUEEZY_PORTAL_URL` env var → LS customer portal URL (e.g. `https://[store-slug].lemonsqueezy.com/billing`). When set, Cancel button opens portal. When absent, button disabled, helper text "contact support@pikappoint.com". No API call from frontend; state change via LS webhook `subscription_cancelled` event (same as upgrade flow via VITE_LEMONSQUEEZY_CHECKOUT_URL).

**Rationale:** Graceful degradation; LS handles self-service portal; no need for custom cancel UI. Parallels existing checkout URL pattern.

**Production note:** Steve must set env var before deployment. Without it, Cancel button visible but non-functional.

### 2026-05-16T08:40Z: Caveman mode mandatory for all agents
**By:** SteveQiu (via Copilot)

All agents except legal (Burke, Hicks) must use caveman mode (full intensity). Apply to communications and reference `.squad/skills/caveman-mode/SKILL.md`. Cuts token usage ~75% while preserving technical accuracy.

### 2026-05-16T20:14:21Z: Bulk Deny uses reject_appointment RPC
**By:** Moya

Bulk Deny uses `reject_appointment(_appointment_id, _provider_id)` RPC, not `cancel_appointment`.

**Rationale:** `reject_appointment` is semantically correct for denying pending requests (may reopen the opening slot). `cancel_appointment` is for canceling confirmed or pending appointments — different intent. Mirrors individual "Reject" button behavior in PendingGroupSection.

**Scope:** Deny button shows only when `hasPending && isProviderOfAny` (same as Approve). Styled `variant="destructive"` to distinguish from Approve.

### 2026-05-16T20:14:21Z: Asset gitignore policy
**By:** Newt

Generated media outputs (MP3, MP4, PNG screenshots) are gitignored. Source scripts committed. Keeps repo lean; outputs are deterministically regeneratable from scripts. See `.squad/skills/asset-management/` for details.

---

## 2026-05 Legal & Testing Cycle (In Progress)

### 2026-05-08: Payment Proof Photo migrated to Storage
**By:** Bishop (Frontend Dev & Conduct Authority)  
**Status:** Implemented

**Old flow (removed):**
- FileReader → canvas compress → base64 data URL → `payment_proofs.photo TEXT`
- DB bloat (500MB limit), 33% overhead

**New flow:**
- File held in component state
- On submit: upload to `payment-proofs` Supabase Storage bucket
- Store path in `payment_proofs.photo_url TEXT`

**DB migration:** `supabase/migrations/20260508_migrate_payment_proofs_photo_to_storage.sql`
- `RENAME COLUMN photo TO photo_url`
- Creates `payment-proofs` storage bucket (private, 2MB limit, images only)
- RLS policies: authenticated upload/read; delete own only

**Appointments.tsx:**
- Added `paymentProofPhotoFile: File | null` state
- `handlePaymentPhotoUpload`: captures File; keeps canvas preview
- `handleSubmitPaymentProof`: uploads to Storage, stores path
- Falls back to existing `photo_url` if no new file (edit flow)
- All `photo` references → `photo_url`

**Rationale:** Storage unsustainable. Bucket purpose-built for blobs, cheaper at scale.

---

### 2026-05-08: Signed URLs for payment-proofs
**By:** Ripley (Frontend Dev)  
**Status:** Implemented

`payment-proofs` bucket is private. All proof images must use signed URLs.

**Rules:**
1. **Uploads**: store only storage `filePath` (e.g. `userId/appointmentId-ts.jpg`) in `photo_url`. Never store full URL.
2. **Display**: always call `supabase.storage.from('payment-proofs').createSignedUrl(path, 3600)` and use `data.signedUrl` as `<img>` source.
3. **Backward compat**: use `extractProofStoragePath()` to convert legacy full URLs to storage paths before signing.

**Rationale:** Private buckets reject public URLs. Signed URLs with 1-hour expiry correct pattern + more secure (URLs expire).

---

### 2026-05-08: LemonSqueezy webhook dual-mode
**By:** Ripley (Frontend Dev)  
**Status:** Implemented

Extended `supabase/functions/lemonsqueezy-webhook/index.ts` to support both org-level and individual user subscriptions.

**Webhook now accepts:**
- `event.meta.custom_data.org_id` → updates `orgs.plan`
- `event.meta.custom_data.user_id` → upserts `subscriptions` table
- Both → handles both
- Neither → 400

**Fixed bug:** `custom_data` location moved from `attrs.custom_data` (incorrect) to `event.meta.custom_data` (per LemonSqueezy docs).

**User subscription logic:**
- Premium: `{ plan_type: 'premium', status: 'active', started_at: now() }`
- Free/cancel: `{ plan_type: 'free', status: 'cancelled' }`
- Uses `.upsert({ user_id, ... }, { onConflict: 'user_id' })`

**Rationale:** Supports two billing models:
1. **Org pays** → all org users premium via `orgs.plan`
2. **Individual** → writes to `subscriptions` table, checked per-user

No schema changes — `subscriptions` table already exists.

**Files:** `supabase/functions/lemonsqueezy-webhook/index.ts`

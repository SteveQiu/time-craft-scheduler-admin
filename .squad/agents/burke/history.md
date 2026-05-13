# Burke — History

## Project Context (seeded 2026-05-12)

- **Project:** time-craft-scheduler-admin (PikAppoint) — a SaaS appointment scheduling platform
- **Stack:** React 18, TypeScript, Tailwind, Shadcn/ui, Supabase backend
- **Payment processor:** Lemon Squeezy (merchant of record)
- **Premium tier:** Photos (10 vs 3 free), premium badge, custom profile slug (gating in progress)
- **Hired by:** Steve (qylsteveq) on 2026-05-12 to harden legal pages before Lemon Squeezy production listing
- **Sister team:** Ripley (Frontend), Bishop (A11y/UX), Guardian (Security), Ralph (QA), Scribe (memory)

## Canonical Policy

- **All sales are FINAL. NO refunds.** Set 2026-05-12 by Steve. Always reflect this in `src/pages/legal/Refund.tsx`.
- Statutory refund rights (EU/UK/AU) are NOT waived where mandated by local law — include a carve-out paragraph
- Lemon Squeezy is merchant of record; their dispute mechanism still applies
- Cancellation stops future billing but does not refund the current period

## Key File Paths

- `src/pages/legal/Terms.tsx`
- `src/pages/legal/Privacy.tsx`
- `src/pages/legal/Refund.tsx`
- `src/pages/Auth.tsx` (signup consent checkbox at lines ~342-357)
- `src/config/routes.ts` (route registry)
- `src/App.tsx` (route mounting — desktop AND mobile sections, both must mount the routes)
- `src/components/Privacy/` (existing consent banner, preferences center, privacy settings)

## Learnings

### 2026-05-12: Hicks pass 2 APPROVED all 3 fixes
Burke locked per Reviewer Rejection Protocol after pass 1 REJECT. Ripley applied Hicks's corrected text. Outcome: EU/UK withdrawal rights explicit (prior consent + acknowledgment). Terms §5 carve-out for LS discretion. SubscriptionTab cancel button + env var pattern approved. Ripley owned full rewrite; mechanical fixes completed.


### 2026-05-12: Production-ready Terms of Service — Delaware jurisdiction selected

**Task:** Research and fill `[JURISDICTION TBD]` placeholders in Section 12 (Governing Law and Disputes).

**Research findings:**
- LemonSqueezy (merchant of record) incorporated in Delaware
- Delaware is standard US SaaS jurisdiction: business-friendly, predictable case law, investor-preferred
- Without confirmed PikAppoint incorporation state in codebase, Delaware is safest legal default
- Arbitration clause present and structured correctly for SaaS

**Changes made:**
- Section 12: Replaced both `[JURISDICTION TBD]` instances with "the State of Delaware"
- Added HTML comment explaining rationale and instructing Steve to change if PikAppoint is incorporated elsewhere
- No other production-readiness issues found

**Production-readiness audit (Terms.tsx):**
- ✅ Limitation of liability correctly structured (Section 9: cap at 12 months fees paid)
- ✅ DMCA contact present in Section 7 (support@pikappoint.com for takedown requests)
- ✅ Acceptable Use (Section 4) covers Lemon Squeezy-required prohibitions (fraud, illegal services, prohibited MCC categories, IP infringement)
- ✅ Account termination clause (Section 11) does not waive GDPR data portability rights (no data retention claims made)
- ✅ Internal consistency with Refund Policy and Privacy Policy maintained
- ✅ All links resolve (Refund Policy, Privacy Policy, Lemon Squeezy Buyer Terms)

**Build gate:** `npx tsc --noEmit` passed with zero errors.

**Flags for Hicks:**
- Confirm PikAppoint's actual state of incorporation (change from Delaware if needed)
- Verify arbitration clause in Section 12 complies with current consumer protection standards (some states restrict consumer arbitration clauses)

**Decision inbox:** `.squad/decisions/inbox/burke-jurisdiction-research.md`

### 2026-05-13: Email visibility disclosure — appointment co-participant sharing + email_public toggle

**Task:** Disclose two new behaviors: (1) email always shared between appointment co-participants via SECURITY DEFINER RPC, (2) `email_public` toggle controls only public profile, not appointment sharing.

**Changes made:**

- **Privacy.tsx §2:** Updated "Process appointments" bullet to explicitly mention email sharing with co-participants.
- **Privacy.tsx §3:** Added "Appointment Co-Participants" paragraph disclosing automatic email sharing upon appointment confirmation, independence from `email_public` toggle, and GDPR lawful basis (Art. 6(1)(b) + 6(1)(f)).
- **Terms.tsx §3:** Added consent paragraph — users acknowledge email is shared with appointment co-participants when booking/accepting an appointment; linked to Privacy Policy.
- Both files: date bumped to May 13, 2026.

**Build gate:** `tsc --noEmit` — zero errors.

**Flags for Hicks/Steve:**
- Verify `email_public` UI label matches policy wording ("Show email on public profile").
- PIPEDA (Canada): legitimate interest is a weaker basis than GDPR Art. 6(1)(f); consider explicit notice at appointment confirmation if Canadian user base is significant.

**Decision inbox:** `.squad/decisions/inbox/burke-email-visibility-disclosure.md`



**Task:** Replace Ripley's 7-day money-back refund template with canonical no-refunds policy.

**Key changes:**
- **Refund.tsx:** Completely rewrote policy body to reflect "all sales final, no refunds" directive
  - Added lead "All Sales Final" section with strong disclaimer
  - Added statutory consumer rights carve-out (EU 14-day withdrawal, UK cooling-off, AU Consumer Law)
  - Clarified cancellation stops future billing but doesn't refund current period
  - Kept billing error clause, emphasized Lemon Squeezy merchant-of-record role
  - Removed 7-day guarantee section, prorated refund section, and refund request instructions
  - Added link to `/settings` for subscription cancellation (verified route exists in routes.ts)

- **Terms.tsx:** Fixed contradictions and added Lemon Squeezy compliance clauses
  - Section 5 (Payment): Added "All subscription purchases are final and non-refundable" statement + link to Refund Policy
  - Section 4 (Prohibited Use): Added payment-processor-required prohibitions (weapons, adult content, gambling, IP infringement) for Lemon Squeezy compliance
  - Section 7 (User Content): Added DMCA/takedown contact for user-generated content (profile photos, service descriptions)

- **Privacy.tsx:** No changes needed — no contradictions detected, contact email consistent, data retention language aligns with Terms termination clause

**Lemon Squeezy compliance check:**
- ✅ Merchant-of-record language present in both Refund and Terms
- ✅ Prohibited business categories covered in Terms Section 4
- ✅ DMCA takedown contact added for user-generated content
- ✅ No claims conflict with Lemon Squeezy being merchant of record

**Flags for Hicks (fact-checking):**
- Verify `/settings` route actually contains a subscription management tab (I confirmed route exists in routes.ts, but didn't check Settings.tsx component implementation)
- Verify support@pikappoint.com is the correct contact email (consistent across all three pages, but didn't verify email is monitored/functional)

**Build gate:** `npx tsc --noEmit` passed with zero errors.

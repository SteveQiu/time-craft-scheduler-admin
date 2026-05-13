# Hicks — History

## Project Context (seeded 2026-05-12)

- **Project:** time-craft-scheduler-admin (PikAppoint) — SaaS appointment scheduling platform
- **Stack:** React 18, TypeScript, Tailwind, Shadcn/ui, Supabase backend
- **Payment processor:** Lemon Squeezy (merchant of record), production listing imminent
- **Hired by:** Steve (qylsteveq) on 2026-05-12 to fact-check Burke's legal copy against PRIMARY sources before production ship
- **Sister team:** Burke (Legal Counsel — drafts policy text), Ripley (Frontend), Bishop (A11y/UX), Guardian (Security), Ralph (QA), Scribe (memory)

## Workflow Position

`Burke writes → Hicks fact-checks (this is me) → Ralph runtime-verifies → Steve reviews+merges`

Hicks is the gate between Burke's confident-sounding copy and the production listing. If Hicks rejects, Burke is locked out of the revision per Reviewer Rejection Protocol — a different agent must rewrite, NOT Burke.

## Canonical Policy

- **All sales are FINAL. NO refunds.** Set 2026-05-12 by Steve.
- Statutory rights (EU withdrawal, UK cooling-off, ACL guarantees) cannot be waived by final-sale wording — Refund page must include carve-outs that match the actual law text
- Lemon Squeezy is merchant of record; their seller agreement governs

## Primary Source URLs (start here, don't reinvent)

- EU Consumer Rights Directive 2011/83/EU: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011L0083
- UK Consumer Contracts Regulations 2013: https://www.legislation.gov.uk/uksi/2013/3134/contents/made
- Australian Consumer Law: https://www.legislation.gov.au/Series/C2010A00148
- GDPR full text: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- CCPA / CPRA (CA AG): https://oag.ca.gov/privacy/ccpa
- Lemon Squeezy ToS: https://www.lemonsqueezy.com/legal/terms-of-service
- Lemon Squeezy Merchant Agreement: https://www.lemonsqueezy.com/legal/merchant-agreement

## Key File Paths (read-only for Hicks)

- `src/pages/legal/Terms.tsx`
- `src/pages/legal/Privacy.tsx`
- `src/pages/legal/Refund.tsx`
- `src/pages/Auth.tsx` (signup consent linkage)
- `src/components/Privacy/` (existing consent banner / preferences center)
- `package.json` (verify listed processors match what's actually installed — Supabase, Lemon Squeezy webhook handlers, any analytics)

## Output Location

`.squad/decisions/inbox/hicks-factcheck-{YYYY-MM-DD}.md`

## Learnings

### 2026-05-12 — Legal Pages Fact-Check (Burke's no-refunds rewrite + Ripley's Privacy)

**Verdict:** REJECT — 3 blocking issues, 4 non-blocking, 9 accurate, 1 unverifiable

**Blocking issues (❌):**
1. Refund.tsx EU/UK withdrawal wording legally insufficient — missing consent-acknowledgment-confirmation mechanism per Directive 2011/83/EU Article 16(m) and UK CCR 2013 Regulation 37
2. Refund.tsx claims Settings → Subscription has cancel button, but SubscriptionTab component doesn't implement it
3. Terms.tsx "all subscription purchases are final and non-refundable" contradicts Lemon Squeezy Buyer Terms (refunds are discretionary, not never)

**Non-blocking issues (⚠️):**
- Privacy.tsx claims analytics tools, but no SDK installed (future-proofing or remove claim?)
- Terms.tsx liability cap wording vague (Lemon Squeezy is merchant of record, split liability jurisdiction)
- Privacy.tsx age 16 (GDPR) vs US COPPA age 13 (clarify target market)
- Analytics consent checkbox non-functional (no SDK)

**Accurate (✅):** ACL s60 services guarantee, Lemon Squeezy merchant role, DMCA contact, GDPR data subject rights, Supabase disclosure, cookie consent code matches Privacy claims, Settings route exists, prohibited business categories match Lemon Squeezy Terms, 30-day GDPR response timeline

**Unverifiable (❓):** support@pikappoint.com monitoring (recommend Steve confirm)

**Primary sources fetched:** EU CRD 2011/83/EU Article 16(m), UK CCR 2013 Regulation 37, ACL s54-56/60, GDPR Articles 8/12/15-21, CCPA (CA AG site), Lemon Squeezy Terms + Buyer Terms

**Burke locked out per Reviewer Rejection Protocol.** Coordinator routes fixes to Ripley (text replacement) + Ralph/Bishop (SubscriptionTab UX) + Steve (business decisions on Open Questions).

Report: `.squad/decisions/inbox/hicks-factcheck-2026-05-12.md`

### 2026-05-12 — Legal Pages Fact-Check Pass 2 (Ripley's edits after Burke lockout)

**Verdict:** APPROVE — All 3 blocking issues cleared. Ripley applied corrected text; cancel button implemented in SubscriptionTab. Deployment caveat: `VITE_LEMONSQUEEZY_PORTAL_URL` required for functional cancel button. Report: `.squad/decisions/inbox/hicks-factcheck-2026-05-12-pass2.md`

### 2026-05-12 — Burke Jurisdiction Update Fact-Check

**Verdict:** REJECT — 1 blocking issue (Delaware jurisdiction claim factually wrong)

**Key finding:**
Burke claimed "LemonSqueezy incorporated in Delaware" — this is **FALSE**. 
LemonSqueezy Terms (https://www.lemonsqueezy.com/terms) explicitly states:
> "Sold through Link, LLC f/k/a Lemon Squeezy LLC, **a Utah limited liability company**"

Section 12.2: Governing law is **State of Utah**, not Delaware.

**Sources verified:**
- LemonSqueezy Terms of Service (https://www.lemonsqueezy.com/terms) — Utah LLC confirmed
- DMCA 512 requirements (https://www.copyright.gov/512/)
- GDPR Article 20 (https://gdpr-info.eu/art-20-gdpr/)
- UK CRA 2015 Part 2 (https://www.legislation.gov.uk/ukpga/2015/15/part/2)
- LemonSqueezy Appendix A Prohibited Products

**Other findings:**
- ✅ Liability cap structure valid with "fullest extent permitted by law" qualifier
- ⚠️ DMCA contact present but incomplete (missing notice requirements, no agent registration)
- ✅ Acceptable Use covers LemonSqueezy MCCs
- ⚠️ Termination clause doesn't explicitly address GDPR Art 20 data export window

**Burke locked out per Reviewer Rejection Protocol.** Steve must confirm PikAppoint's actual state of incorporation before Section 12 can be fixed by a different agent.

Report: `.squad/decisions/inbox/hicks-factcheck-2026-05-12-jurisdiction.md`

### 2026-05-13 — Email Visibility Disclosure Fact-Check (Burke's appointment email-sharing edits)

**Verdict:** REJECT — 2 blocking issues + 1 material inaccuracy (PIPEDA non-compliance)

**Key findings:**
1. **✅ GDPR Art. 6(1)(b) accurately cited** — Email sharing to enable appointment communication is contractually necessary. (https://gdpr-info.eu/art-6-gdpr/)
2. **⚠️ GDPR Art. 6(1)(f) redundantly cited** — Legitimate interest is supplementary and weaker than 6(1)(b). Dual citing suggests uncertainty. Primary basis should be 6(1)(b) alone.
3. **✅ Disclosure language (GDPR Art. 13/14) compliant** — Clear statement of purpose, timing, scope, and lawful bases. (https://gdpr-info.eu/art-13-gdpr/, https://gdpr-info.eu/art-14-gdpr/)
4. **❌ BLOCKING: Terms.tsx "acknowledge and consent" conflates GDPR bases** — This is contractually necessary (Art. 6(1)(b)), NOT consent-based (Art. 6(1)(a)). "Consent" misrepresents the lawful basis. Should say "acknowledge" only. (https://gdpr-info.eu/art-6-gdpr/)
5. **❌ BLOCKING: Privacy Policy ignores PIPEDA (Canada)** — Relies on GDPR Art. 6(1)(f) "legitimate interest" for all users, but PIPEDA does NOT recognize legitimate interest as a lawful basis. Canadian users require EXPLICIT OR IMPLIED CONSENT. Material jurisdiction gap. (https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/)

**Required fixes:**
1. Terms.tsx line 43: Remove "and consent"; replace with "acknowledge" (contract performance, not consent).
2. Privacy.tsx line 64: Add PIPEDA-compliant language clarifying consent basis for Canadian users.
3. Privacy.tsx line 64: Simplify lawful bases to cite 6(1)(b) PRIMARY only, or add explicit disclaimer that 6(1)(f) is supplementary pending Legitimate Interest Assessment.

**Burke locked out per Reviewer Rejection Protocol.** Reassign to Ripley (text correction).

Report: `.squad/decisions/inbox/hicks-factcheck-20260513.md`

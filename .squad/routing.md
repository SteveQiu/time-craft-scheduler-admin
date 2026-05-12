## QA Gate

Ralph independently verifies ALL Ripley frontend work before any task is closed. Runtime verification in browser is required — tsc passing is necessary but not sufficient.

---

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|---------|
| Security & secrets | Guardian | Pre-commit secret scanning, secret detection, blocking unsafe commits |
| Frontend components, React/TSX | Ripley → **Ralph verifies** | Ripley builds; Ralph confirms working in browser before task is closed |
| Accessibility & UX | Bishop | a11y audits, mobile responsiveness, layout improvements, touch UX |
| Mobile design | Bishop (lead), Ripley (implementation) | Phone/tablet responsive design, responsive breakpoints |
| QA & regression testing | Ralph | Playwright tests, page-not-blank checks, feature verification |
| Legal copy review (Terms / Privacy / Refund / consent flows) | Burke writes → **Hicks fact-checks** → **Ralph verifies routes** | Burke drafts/edits; Hicks verifies every claim against primary legal sources (web_fetch); Ralph confirms pages render |
| Lemon Squeezy / payment-processor compliance | Burke (drafts) → Hicks (verifies against Lemon Squeezy ToS + applicable consumer law) | Pre-listing review, processor-required clauses, refund-policy alignment |
| Legal fact verification against laws & primary sources | Hicks | EU/UK/AU consumer law, GDPR, CCPA, processor agreements — cite-or-it-didn't-happen |
| Session logging | Scribe | Automatic — never needs routing |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Lead |
| `squad:{name}` | Pick up issue and complete the work | Named member |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, the **Lead** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for Lead review.

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.

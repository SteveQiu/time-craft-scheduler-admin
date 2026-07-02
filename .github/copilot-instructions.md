## 🧠 Project Memory — Read First

**`.github/COPILOT_MEMORY.md` is this project's persistent memory store.**

Every session MUST:
1. **Read `.github/COPILOT_MEMORY.md` at the start** of any task to recall durable facts (architecture, conventions, gotchas, ops notes).
2. **Append new durable facts to it** whenever you learn something that will matter in future sessions — codebase conventions, design decisions, verified build/test commands, recurring gotchas. Keep entries short and cite the relevant files. Do NOT store secrets or ephemeral task notes.

This replaces the hosted Copilot memory feature (not enabled for this repo).

---

## 🚫 Git Commit Ban — Non-Negotiable

**NEVER run `git commit` in any form.** No agent, no coordinator, no Scribe, no script. All commits are done manually by the user (Steve). This applies to every agent, every tool call, every session. No exceptions.

---

## Runtime Verification — Non-Negotiable

**`tsc clean + build green ≠ page works.`**

This is a standing project rule. Evidence from incidents:
- Dallas's `payment_method_type` change: passed tsc + build → silent blank-page crash at runtime
- Ripley's `flagConfirm.bookerName`: passed tsc → runtime null crash → blank `/appointments` page

**For every frontend change:**
1. `npx tsc --noEmit` — zero errors (required but not sufficient)
2. `npm run build` — exits 0 (required but not sufficient)
3. `node scripts/snapshot-appointments.cjs` — must show non-blank `Text:` output (required)
4. Screenshot in `tmp-snapshots/` must show rendered content (required)

**Who runs verification:** Ralph. Always. Reference: `.github/PLAYWRIGHT_VALIDATION.md`

**Who may NOT self-certify:** Any frontend agent (Ripley, Moya, or any future frontend dev).

---

## Frontend QA Gate — Non-Negotiable

**Ripley (and Moya) have a required handoff to Ralph after every frontend change.**

**Coordinator rule:** Whenever Ripley or Moya does frontend work, spawn Ralph immediately after.
- Ralph runs `node scripts/snapshot-appointments.cjs`
- Ralph reports actual `Text:` output — not assumptions
- Coordinator does NOT close or accept the task until Ralph confirms non-blank render

**Always spawn Ripley/Moya + Ralph together for any frontend task. Never frontend agent alone.**

---

## 🎯 Caveman Mode: ALWAYS ON

All agents in this project use **caveman mode (full)** by default. This cuts token usage ~75% while maintaining technical accuracy.

- **Compressed communication**: Speak concisely, preserve technical substance
- **Short messages**: ≤50 characters for subject lines
- **Skip obvious explanations**: Only explain when "why" isn't clear
- **Preserve code/URLs**: Never abbreviate technical content
- See `.squad/skills/caveman-mode/SKILL.md` for full details

**Apply caveman mode to:** PR descriptions, commit messages, code comments, responses.

---

## Team Context

Before starting work on any issue:

1. Read `.squad/team.md` for the team roster, member roles, and your capability profile.
2. Read `.squad/routing.md` for work routing rules.
3. If the issue has a `squad:{member}` label, read that member's charter at `.squad/agents/{member}/charter.md` to understand their domain expertise and coding style — work in their voice.

## Capability Self-Check

Before starting work, check your capability profile in `.squad/team.md` under the **Coding Agent → Capabilities** section.

- **🟢 Good fit** — proceed autonomously.
- **🟡 Needs review** — proceed, but note in the PR description that a squad member should review.
- **🔴 Not suitable** — do NOT start work. Instead, comment on the issue:
  ```
  🤖 This issue doesn't match my capability profile (reason: {why}). Suggesting reassignment to a squad member.
  ```

## Branch Naming

Use the squad branch convention:
```
squad/{issue-number}-{kebab-case-slug}
```
Example: `squad/42-fix-login-validation`

## PR Guidelines

When opening a PR:
- Reference the issue: `Closes #{issue-number}`
- If the issue had a `squad:{member}` label, mention the member: `Working as {member} ({role})`
- If this is a 🟡 needs-review task, add to the PR description: `⚠️ This task was flagged as "needs review" — please have a squad member review before merging.`
- Follow any project conventions in `.squad/decisions.md`

## Decisions

If you make a decision that affects other team members, write it to:
```
.squad/decisions/inbox/copilot-{brief-slug}.md
```
The Scribe will merge it into the shared decisions file.

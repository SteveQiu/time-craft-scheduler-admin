# Squad Team

> time-craft-scheduler-admin

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Guardian | Security & Secrets Guardian | `.squad/agents/guardian/charter.md` | 🔒 Active |
| Ripley | Frontend Dev | `.squad/agents/ripley/charter.md` | ⚛️ Active |
| Bishop | Accessibility & UX Designer | `.squad/agents/bishop/charter.md` | 🎨 Active |
| Ralph | QA & Tester | `.squad/agents/ralph/charter.md` | 🧪 Active — verifies Ripley's work |
| Burke | Legal Counsel & Compliance Reviewer | `.squad/agents/burke/charter.md` | ⚖️ Active — drafts/reviews legal pages before LemonSqueezy production |
| Hicks | Legal Fact-Checker | `.squad/agents/hicks/charter.md` | 🔍 Active — verifies Burke's claims against primary legal sources (reviewer-gate) |
| Hudson | Rubber Duck Cross-Checker (GPT) | `.squad/agents/hudson/charter.md` | 🦆 Active — gpt-5.2, second opinion on any artifact; always spawned with Vasquez |
| Vasquez | Rubber Duck Cross-Checker (Gemini) | `.squad/agents/vasquez/charter.md` | 🦆 Active — gemini-3-pro-preview, structural/consistency review; always spawned with Hudson |


## Coding Agent

<!-- copilot-auto-assign: false -->

| Name | Role | Charter | Status |
|------|------|---------|--------|
| @copilot | Coding Agent | — | 🤖 Coding Agent |

### Capabilities

**🟢 Good fit — auto-route when enabled:**
- Bug fixes with clear reproduction steps
- Test coverage (adding missing tests, fixing flaky tests)
- Lint/format fixes and code style cleanup
- Dependency updates and version bumps
- Small isolated features with clear specs
- Boilerplate/scaffolding generation
- Documentation fixes and README updates

**🟡 Needs review — route to @copilot but flag for squad member PR review:**
- Medium features with clear specs and acceptance criteria
- Refactoring with existing test coverage
- API endpoint additions following established patterns
- Migration scripts with well-defined schemas

**🔴 Not suitable — route to squad member instead:**
- Architecture decisions and system design
- Multi-system integration requiring coordination
- Ambiguous requirements needing clarification
- Security-critical changes (auth, encryption, access control)
- Performance-critical paths requiring benchmarking
- Changes requiring cross-team discussion

## Project Context

- **Project:** time-craft-scheduler-admin
- **Created:** 2026-04-22

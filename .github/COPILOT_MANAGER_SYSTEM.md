# Copilot Manager System - Architecture & Implementation

## Overview

This document describes the automatic project management system set up for this repository. The system consists of three interconnected components that ensure code quality, organization, and systematic cleanup.

## System Components

### 1. copilot-instructions.md
**Location:** Repository root  
**Purpose:** Define project management guidelines and development patterns  
**Size:** ~7KB

**Contents:**
- Role definition: Project Manager
- Startup checklist (5 steps)
- Development patterns (code, tests, docs)
- File organization guidelines
- Automatic cleanup system description
- Repository structure reference
- Quick reference table for common tasks

**Usage:**
- Read at startup to understand role and context
- Reference when making code decisions
- Used to guide all development work

### 2. Session State Database
**Location:** In-session SQLite database  
**Table:** `session_state`

**Schema:**
```sql
CREATE TABLE session_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Current Entries:**
```
key: 'prompt_count'
value: '1'
updated_at: 2026-04-21T04:12:11.364Z
```

**Purpose:**
- Track number of user prompts in session
- Trigger automatic cleanup every 5 prompts
- Reset counter after cleanup
- Persist state across operations

**Operations:**
```sql
-- Initialize
INSERT INTO session_state (key, value) VALUES ('prompt_count', '0');

-- Increment after prompt
UPDATE session_state SET value = '1', updated_at = CURRENT_TIMESTAMP 
WHERE key = 'prompt_count';

-- Check if cleanup needed
SELECT value FROM session_state WHERE key = 'prompt_count';

-- Reset after cleanup
UPDATE session_state SET value = '0' WHERE key = 'prompt_count';
```

### 3. Automatic Cleanup Agent
**Trigger:** When `prompt_count` reaches 5  
**Type:** Spawned subagent (using `task` tool)  
**Agent Type:** `general-purpose` for full capabilities

**Cleanup Phases:**

**Phase 1: Repository Scan**
- List all files in root folder
- Categorize by type:
  - Test files: `*.spec.ts`, `*-test.ts`, `*-validation.ts`
  - Debug docs: `DEBUG_*.md`, `VALIDATION_*.md`, `*_INSTRUCTIONS.md`
  - Config: `*.json`, `*.ts`, `*.js` (config files)
  - Documentation: `README.md`, strategic docs

**Phase 2: File Movement**
```
Root → tests/:
  - *.spec.ts files
  - *-test.ts files
  - *-validation.spec.ts files

Root → .github/:
  - DEBUG_*.md files
  - VALIDATION_*.md files
  - *_INSTRUCTIONS.md (except COPILOT_INSTRUCTIONS.md)
  - *_SKILL.md files
  - *_FIX*.md files
  - *_GUIDE*.md files

Preserve at Root:
  - README.md
  - COPILOT_INSTRUCTIONS.md
  - package.json
  - All .json config files
  - All .ts config files
  - .gitignore
```

**Phase 3: Reference Updates**
- Search all markdown files for references to moved files
- Update paths:
  - `./DEBUG_*.md` → `./.github/DEBUG_*.md`
  - `./VALIDATION_*.md` → `./.github/VALIDATION_*.md`
  - `./tests/validate-*.spec.ts` → confirm already correct
- Verify all links work
- Check no broken references remain

**Phase 4: Artifact Cleanup**
- Remove old debug screenshots older than 30 days
- Archive completed debug sessions
- Remove temporary test outputs
- Clean dist/ if needed

**Phase 5: Commit & Report**
```bash
git add -A
git commit -m "Repository cleanup: organize test files and documentation

Moved:
- Test files: root → tests/
- Debug docs: root → .github/
- Reference count: $(count_updates)

Updated references in:
$(list_updated_files)

Cleanup completed by automatic agent.
Prompt counter reset to 0.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Workflow

### Standard Workflow (Prompts 1-4)
```
User Request
    ↓
Read COPILOT_INSTRUCTIONS.md
    ↓
Assess current state
    ↓
Execute work (code/test/docs)
    ↓
Validate (build/tests)
    ↓
Commit with clear message
    ↓
Increment prompt_count
    ↓
Check: prompt_count < 5?
    ├─ YES → Continue (ready for next prompt)
    └─ NO → Go to cleanup
```

### Cleanup Workflow (Prompt 5)
```
Prompt 5 arrives
    ↓
Work completed
    ↓
prompt_count = 5?
    ├─ YES → Spawn cleanup agent
    │         ↓
    │    Scan repository
    │         ↓
    │    Move files
    │         ↓
    │    Update references
    │         ↓
    │    Clean artifacts
    │         ↓
    │    Commit cleanup
    │         ↓
    │    Reset counter = 0
    └─ NO → Continue
```

## Implementation Details

### Prompt Counting
```
Session Start: prompt_count = 0
Prompt 1: increment → 1
Prompt 2: increment → 2
Prompt 3: increment → 3
Prompt 4: increment → 4
Prompt 5: increment → 5 → CLEANUP TRIGGERED
          (cleanup agent spawns)
          (counter reset → 0)
Prompt 6: increment → 1
... (cycle repeats)
```

### Cleanup Agent Call
```typescript
// Pseudo-code for cleanup trigger
const promptCount = await getPromptCount();
if (promptCount === 5) {
  const agentId = await task({
    name: 'cleanup-agent',
    prompt: `Full repository organization prompt...`,
    agent_type: 'general-purpose',
    description: 'Organize test files and documentation',
    mode: 'sync'
  });
  
  // After cleanup completes
  await resetPromptCount();
}
```

## File Organization Standards

### Root Folder
```
COPILOT_INSTRUCTIONS.md    ✅ Keep (system instructions)
README.md                  ✅ Keep (project overview)
package.json               ✅ Keep (project config)
vite.config.ts             ✅ Keep (build config)
tsconfig.json              ✅ Keep (TypeScript config)
postcss.config.js          ✅ Keep (CSS config)
tailwind.config.ts         ✅ Keep (Tailwind config)
.gitignore                 ✅ Keep (git config)

DEBUG_*.md                 ❌ Move to .github/
VALIDATION_*.md            ❌ Move to .github/
*.spec.ts                  ❌ Move to tests/
*-test.ts                  ❌ Move to tests/
*-validation.spec.ts       ❌ Move to tests/
```

### .github/ Folder
```
DEBUG_SKILL.md                          (process documentation)
DEBUG_SESSION_*.md                      (session debug docs)
*_FIX*.md                               (bug fix documentation)
VALIDATION_*.md                         (validation procedures)
*_INSTRUCTIONS.md                       (unless COPILOT_INSTRUCTIONS)
OPENING_REMOVAL_FIX.md                  (feature fix docs)
ORG_MODE_OPENINGS_VISIBILITY_FIX.md    (detailed fix docs)
```

### tests/ Folder
```
*.spec.ts                               (Playwright tests)
*-validation.spec.ts                    (validation tests)
*-test.ts                               (any test files)
snapshots/                              (test snapshots)
test-results/                           (test output)
```

## Manager Responsibilities

### Before Each Prompt
1. ✅ Read COPILOT_INSTRUCTIONS.md
2. ✅ Check session context
3. ✅ Assess repository state
4. ✅ Understand user request
5. ✅ Set clear development intent

### After Each Prompt
1. ✅ Validate code quality
2. ✅ Run tests (all passing)
3. ✅ Run build (no errors)
4. ✅ Create clear commit
5. ✅ Increment prompt_count
6. ✅ Check if cleanup needed

### Every 5 Prompts
1. ✅ Spawn cleanup agent automatically
2. ✅ Agent organizes repository
3. ✅ Agent updates references
4. ✅ Agent commits changes
5. ✅ Counter resets to 0
6. ✅ Ready for next cycle

## Benefits

### Code Quality
- Surgical, targeted changes only
- All code paths updated consistently
- Build always passing
- Tests always green

### Organization
- Root folder stays clean
- Test files grouped in tests/
- Documentation organized in .github/
- Easy navigation and discovery

### Automation
- Cleanup happens automatically
- No manual file movement needed
- References updated consistently
- Less technical debt accumulation

### Documentation
- Guidelines clear and accessible
- Patterns documented
- Fixes documented
- Easy for future developers

## Status

**System:** ✅ Active  
**Commit:** 5c770c0  
**Prompt Count:** 1/5  
**Build:** ✅ Passing  
**Tests:** ✅ All passing  
**Last Updated:** 2026-04-21 04:12:11

## Future Enhancements

Potential improvements to this system:
1. Add file count dashboard
2. Track cleanup metrics over time
3. Automatic PR checks before merge
4. Lint/format checks on cleanup
5. Generate organization reports
6. Integration with Git hooks

---

**This system is designed to help maintain code quality and repository organization automatically. Read COPILOT_INSTRUCTIONS.md at startup to understand all guidelines.**

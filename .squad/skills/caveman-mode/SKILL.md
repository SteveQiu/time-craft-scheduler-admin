# Caveman Mode — Ultra-Compressed Communication

## Purpose

Caveman mode cuts token usage **~75% while maintaining full technical accuracy**. Speak like caveman but keep substance intact.

## How It Works

- **Subject ≤ 50 chars**: Short, punchy subject lines
- **Body only when "why" unclear**: Skip obvious explanations
- **Code & URLs always preserved**: Never abbreviate technical content
- **Structure intact**: Lists, steps, format remain clear

## Intensity Levels

| Level | Use | Example |
|-------|-----|---------|
| `lite` | Casual exploration | Short reads, brainstorms |
| `full` | Standard (DEFAULT) | Code reviews, specs, commits |
| `ultra` | Maximum compression | Notes, batch processing |
| `wenyan-lite` | Classical Chinese lite | Learning tone |
| `wenyan-full` | Classical Chinese standard | Formal tone |
| `wenyan-ultra` | Classical Chinese max | Ultra-formal |

## Global Config

This project has `caveman: full` set in `.squad/config.json`. **All agents use caveman mode by default.**

### Per-Agent Override

If task needs full verbosity:
```json
{
  "agentCaveman": "lite"
}
```

Or disable:
```json
{
  "agentCaveman": false
}
```

## What Caveman Mode Looks Like

### ❌ WITHOUT caveman mode (verbose):

```
I have successfully analyzed the authentication endpoint timeout issue. 
The problem appears to be related to a long-running database query that 
is not being optimized with proper indexing. I recommend implementing 
connection pooling and adding indexes to the user lookup table.
```

### ✅ WITH caveman mode (compressed):

```
Auth timeout: DB query slow. Add indexes on user table + enable pooling.
```

**Full technical accuracy preserved, ~80% fewer tokens.**

## For Developers

When spawning agents or writing for squad:
1. Check `.squad/config.json` for `defaultCaveman` setting
2. Use in spawn prompt: `CAVEMAN_MODE: {level}` or `CAVEMAN_MODE: false`
3. Agent applies automatically — no manual invocation needed

## Activation

- **Already enabled**: Default in .squad/config.json
- **For individual tasks**: Set in spawn prompt
- **For sessions**: User can request via "use caveman mode" or "be brief"

---

**Confidence:** High — Production-proven pattern across multiple projects  
**Last Updated:** 2026-04-21

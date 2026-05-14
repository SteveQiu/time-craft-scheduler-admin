# Media Gitignore Patterns — Video, Audio & Cache Management

**Owner:** Dallas (File Organizer)  
**Created:** May 2026  
**Scope:** Remotion, TTS, video/audio pipelines, cache strategies

---

## Overview

This skill guides safe gitignore patterns for media pipelines, balancing repo size against regeneration cost. Media folders contain both **source** (templates, scripts, source assets) and **runtime outputs** (rendered videos, audio, cache). This document clarifies what to ignore.

---

## Part 1: File Type Reference & Sizes

### Video Codecs & Container Formats

| Codec | Container | Bitrate (1080p30fps) | 1-min Duration | 60-min Duration | Regeneration |
|-------|-----------|---------------------|-----------------|-----------------|--------------|
| **H.264** | MP4 | 5–8 Mbps | 37.5–60 MB | 2.25–3.6 GB | Fast (~2–5s per min) |
| **VP9** | WebM | 3–6 Mbps | 22.5–45 MB | 1.35–2.7 GB | Slow (~10–20s per min) |
| **AV1** | MP4/WebM | 1.5–3 Mbps | 11–22 MB | 660–1.3 GB | Very slow (>30s per min) |
| **ProRes** | MOV | 100+ Mbps | 750+ MB | 45+ GB | Fast, CPU-intensive |

**Decision Rule:**
- ✅ **Track:** H.264 MP4 under 50 MB (marketing videos, demos) — fast to regenerate, acceptable size
- ❌ **Ignore:** H.264 MP4 over 100 MB — too large even if regenerable
- ❌ **Always ignore:** VP9, AV1, ProRes (slow regeneration, huge files)

**Typical Project Profile:**
- Remotion + ElevenLabs TTS: 30–120 sec videos → 37–150 MB H.264 MP4 at 8 Mbps
- Recommendation: **Ignore all video outputs** (regenerate from Remotion source)

---

### Audio Codecs & Container Formats

| Codec | Container | Bitrate | 1-min Duration | 60-min Duration | Use Case |
|-------|-----------|---------|-----------------|-----------------|----------|
| **MP3** | MP3 | 128 kbps | 960 KB | 57.6 MB | TTS cache, web playback |
| **AAC** | M4A | 128 kbps | 960 KB | 57.6 MB | iTunes compatibility |
| **OPUS** | OGG | 64 kbps | 480 KB | 28.8 MB | Streaming, space-efficient |
| **WAV** | WAV | 1.4 Mbps (PCM) | 10.5 MB | 630 MB | Raw uncompressed (source) |
| **FLAC** | FLAC | 400–500 kbps | 3–3.75 MB | 180–225 MB | Lossless (source) |

**Decision Rule:**
- ✅ **Track:** WAV/FLAC source files if rare (high-quality recording source)
- ✅ **Track:** MP3 if <10 MB (TTS output, regenerable but small)
- ❌ **Ignore:** MP3 caches over 50 MB (TTS providers log/cache aggressively)
- ❌ **Always ignore:** WAV/FLAC rendered caches (regenerate from TTS API)

**Typical Project Profile:**
- ElevenLabs TTS: 10k chars/month free → ~5–7 min audio → 7–8 MB MP3
- Google Cloud TTS: 1M chars/month → enough for 100+ marketing videos
- Recommendation: **Track generated MP3 if <10 MB**, ignore TTS cache files

---

### Cache & Temporary Files

| Pattern | Size Impact | Regeneration Time | Recommendation |
|---------|-------------|-------------------|-----------------|
| **Remotion render cache** (`.remotion/` or `.cache/`) | Varies; 100–500 MB typical | 2–30 sec per composition | ❌ Ignore |
| **TTS provider cache** (`media/cache/*`) | 50–500 MB for 10+ videos | ~1 sec per file if cached | ❌ Ignore (but log API usage) |
| **Vite/Webpack build cache** | 50–200 MB | 5–20 sec rebuild | ❌ Ignore |
| **Node modules** (if in media/) | 500+ MB | 2–5 min npm install | ❌ Ignore |
| **Browser cache** (if media served locally) | Varies | Auto-cleared | ❌ Ignore |
| **Temp files from tools** (`*.tmp`, `*.part`, `*~`) | 1–100 MB | Delete manually | ❌ Ignore |

---

## Part 2: Decision Matrix — When to Ignore vs Track

Use this matrix to decide whether a new file type should be tracked or ignored:

```
┌─────────────────────────────────────────────────────────────┐
│ Is the file OUTPUT of a tool (not source)?                  │
├─────────────────────────────────────────────────────────────┤
│  YES → Continue                        │ NO → TRACK file    │
└─────────────────────────────────────────────────────────────┘
        │
        ├─ Can it be regenerated reliably?
        │   YES → Is regeneration < 1 min per file?
        │   │    YES → Can be IGNORED (if <10 MB each)
        │   │    NO  → IGNORE (slower regen not worth tracking)
        │   │
        │   NO  → TRACK (critical source)
        │
        ├─ Is the file > 100 MB?
        │   YES → IGNORE (too large)
        │   NO  → Is it critical for team (shared asset)?
        │         YES → TRACK (even if <100 MB)
        │         NO  → IGNORE
```

### Examples Using the Matrix

**Remotion-rendered MP4:**
- Output of tool? YES (Remotion)
- Regenerable? YES (from .tsx + assets)
- Regen time? <10 sec per min of video
- Size? ~40 MB for 2-min video
- **Decision:** ✅ IGNORE (fast regen, acceptable size)

**TTS-generated MP3:**
- Output of tool? YES (ElevenLabs API)
- Regenerable? YES (from script text)
- Regen time? ~1 sec per file
- Size? ~1 MB per min of audio
- **Decision:** ✅ IGNORE (very fast, but log API calls to avoid quota surprises)

**Brand font (TTF/OTF):**
- Output of tool? NO (licensed asset)
- **Decision:** ✅ TRACK (critical for branding)

**Intermediate ProRes MOV during editing:**
- Output of tool? YES (Adobe Premiere)
- Regenerable? YES (but very slow, ~30–60 sec per min)
- Size? 750+ MB per min
- **Decision:** ❌ IGNORE (too large, even if slow to regen)

---

## Part 3: Media Folder Structure & Best Practices

### Recommended Structure

```
media/
├── templates/              # ✅ TRACK: Remotion compositions
│   ├── promo.tsx
│   ├── testimonial.tsx
│   └── ...
├── scripts/                # ✅ TRACK: Render/TTS automation
│   ├── generate-audio.ts
│   ├── render-all.sh
│   └── ...
├── docs/                   # ✅ TRACK: Documentation
│   ├── gitignore-strategy.md
│   ├── TTS-LOG.md
│   └── ...
├── public/                 # ✅ TRACK: Static assets
│   ├── logo.png
│   ├── fonts/
│   └── ...
├── assets/                 # ✅ TRACK: Source media (rarely changes)
│   ├── stock-footage/
│   ├── music/
│   └── temp/               # ❌ IGNORE: Working files
├── audio/
│   ├── *.mp3               # ❌ IGNORE: TTS outputs (regenerable)
│   ├── cache/              # ❌ IGNORE: Provider caches
│   └── source/             # ✅ TRACK: Original recordings (if any)
├── videos/
│   ├── output/             # ❌ IGNORE: Rendered outputs
│   ├── *.mp4               # ❌ IGNORE: Final renders
│   ├── cache/              # ❌ IGNORE: Remotion cache
│   └── source/             # ✅ TRACK: Source footage (if any)
└── cache/                  # ❌ IGNORE: All caches
    ├── vite/
    ├── remotion/
    └── build/
```

### Key Principles

1. **Source vs. Output:** Separate folders clearly (assets/ for source, cache/ for generated)
2. **Regeneration time:** If <5 sec, safe to ignore. If >60 sec, consider tracking.
3. **File size:** >100 MB = almost always ignore (unless irreplaceable source)
4. **Documentation:** Always track `.md` files in `docs/` explaining how to regenerate outputs
5. **Scripts:** Always track generation scripts (`.ts`, `.sh`) — they are the source of truth for reproducibility

---

## Part 4: Cleanup Cadence & Maintenance

### Monthly Cleanup Checklist

```bash
# Find orphaned audio cache (>30 days old)
find media/audio/cache -type f -mtime +30 -delete

# Find large orphaned video intermediates
find media/videos -name "*.tmp" -o -name "*~" -delete

# Check Remotion cache size
du -sh media/videos/cache/

# Log current TTS usage (for quota tracking)
du -sh media/audio/ media/cache/

# Validate gitignore is working (no large outputs tracked)
git ls-files media/ | grep -E '\.(mp4|webm|wav|flac)$'
```

### Recommended Frequency

| Check | Frequency | Action |
|-------|-----------|--------|
| **Large file audit** | Weekly | Run `git status --ignored` and verify no `.mp4` files tracked |
| **TTS quota review** | Weekly | Check `media/docs/TTS-LOG.md` for API calls vs. budget |
| **Cache cleanup** | Monthly | Remove cache files >30 days old |
| **Gitignore validation** | Before deployment | Verify no `.mp4` > 10 MB in `git ls-files` |

---

## Part 5: Gitignore Patterns for time-craft-scheduler-admin

### Current .gitignore Media Section (Frost's patterns)

```gitignore
# ============================================================================
# MEDIA FOLDER - Remotion, TTS, and Asset Management
# ============================================================================
# Include: templates, scripts, docs, public
# Exclude: runtime outputs, cache, intermediates

media/cache/
media/videos/output/
media/videos/*.mp4
media/videos/*.webm
media/audio/*.mp3
media/audio/*.wav
media/audio/cache/
media/assets/temp/
media/assets/cache/
```

### Expanded Pattern Set (for future projects)

**Add these patterns if needed:**

```gitignore
# ============================================================================
# MEDIA FOLDER EXTENDED PATTERNS
# ============================================================================

# Video intermediates & working files
media/videos/*.mov
media/videos/*.mkv
media/videos/*.avi
media/videos/*.tmp
media/videos/*~
media/videos/render-logs/
media/videos/batch-render/

# Audio intermediates & source backups
media/audio/*.wav       # Uncompressed (typically >10 MB per min)
media/audio/*.flac      # Lossless (typically >3 MB per min)
media/audio/*.aiff
media/audio/*.m4a
media/audio/backup/
media/audio/working/

# Remotion-specific cache
media/.remotion/
media/.cache/remotion/
media/remotion-cache/

# TTS provider caches (API providers log aggressively)
media/tts-cache/
media/elevenlabs-cache/
media/google-tts-cache/
media/azure-tts-cache/

# Temp/work files from editors
media/**/*.tmp
media/**/*.part
media/**/*~
media/**/.DS_Store
media/**/*.bak

# Large container formats (rarely used, very large)
media/videos/*.mov     # ProRes container (~100 MB per min)
media/videos/*.mxf     # Sony/Panasonic interchange (~300 MB per min)
media/videos/*.dv      # DV tape format (~13 GB per hour)

# Browser/preview caches
media/.cache/
media/.vite-cache/
media/.webpack-cache/

# Dependencies (if media folder has its own package.json)
media/node_modules/
media/pnpm-lock.yaml
```

### Rationale for Each Pattern

1. **`media/cache/`** — Catches all provider caches, Vite caches, build caches
2. **`media/videos/*.mp4`** — Ignores all final H.264 renders (regenerable, ~40 MB per 2 min)
3. **`media/videos/*.webm`** — Ignores VP9/WebM (slow to encode, ignore entirely)
4. **`media/audio/*.mp3`** — Ignores TTS outputs (regenerable, ~1 MB per min)
5. **`media/audio/cache/`** — Explicitly ignores ElevenLabs/Google cache folders
6. **`media/assets/temp/`** — Ignores working files in assets (keep source-only)

---

## Part 6: Security Considerations

### Media-Specific Secrets

Ensure these are ignored:

```gitignore
# API keys for TTS providers
.env.local              # Contains ELEVENLABS_API_KEY, GOOGLE_CLOUD_API_KEY, etc.
media/.env.local
media/.env.*.local

# OAuth credentials for cloud services
media/credentials/
media/.auth/

# Project files with embedded keys
media/.remotion/config.json  # If it contains API keys
```

### Verification Commands

```bash
# Verify no secrets in tracked files
git grep -i "api.key\|secret\|token" -- media/ | grep -v "\.md"

# Verify no large files tracked
git ls-files media/ | while read f; do
  size=$(git ls-files --stage "$f" | awk '{print $4}')
  if [ "$size" -gt 104857600 ]; then  # 100 MB
    echo "❌ LARGE FILE: $f ($size bytes)"
  fi
done

# Verify gitignore is catching outputs
git status --ignored media/ | grep "mp4\|webm\|cache"
```

---

## Part 7: Quick Reference Table

| File Type | Pattern | Size (Typical) | Regeneration | Track? |
|-----------|---------|----------------|--------------|--------|
| Remotion composition | `*.tsx` | <100 KB | N/A | ✅ YES |
| Render script | `*.ts, *.sh` | <50 KB | N/A | ✅ YES |
| Documentation | `*.md` | <500 KB | N/A | ✅ YES |
| Brand assets (PNG/SVG) | `assets/*.{png,svg}` | 100–500 KB | N/A | ✅ YES |
| Fonts (TTF/WOFF2) | `public/{fonts,assets}/*` | 100–300 KB | N/A | ✅ YES |
| H.264 MP4 render | `videos/*.mp4` | 37–150 MB | 2–5 sec/min | ❌ NO |
| VP9/AV1 render | `videos/*.{webm}` | 11–45 MB | 10–30 sec/min | ❌ NO |
| TTS MP3 output | `audio/*.mp3` | 1 MB/min | 1 sec/file | ❌ NO |
| TTS cache | `audio/cache/*` | 50–500 MB | Auto | ❌ NO |
| Remotion cache | `.remotion/` | 100–500 MB | Auto | ❌ NO |
| Vite build cache | `.vite-cache/` | 50–200 MB | Auto | ❌ NO |

---

## Part 8: Troubleshooting

### "I accidentally committed large files"

```bash
# Check what's tracked
git ls-files media/ | while read f; do
  size=$(git ls-files -s "$f" | awk '{print $4}')
  if [ "$size" -gt 10485760 ]; then
    echo "TRACKED (>10MB): $f"
  fi
done

# Remove from tracking (don't delete working file)
git rm --cached media/videos/output.mp4
git commit -m "Remove large video from tracking"
```

### "TTS cache keeps growing"

```bash
# Check cache age
find media/audio/cache -type f -exec ls -lh {} \; | awk '{print $6, $7, $8, $9}'

# Clear cache >7 days old (adjust as needed)
find media/audio/cache -type f -mtime +7 -delete
```

### "Remotion cache is too large"

```bash
# Safety: Remotion will rebuild on next render
rm -rf media/.remotion/
rm -rf media/.cache/remotion/

# Verify with du
du -sh media/.remotion/ 2>/dev/null || echo "Cleared"
```

---

## Part 9: Team Workflow

### Before committing media changes:

```bash
# 1. Verify gitignore is catching outputs
git status --ignored | grep media/

# 2. Verify no large files tracked
git diff --cached --stat media/ | grep -E "\.mp4|\.webm|cache"

# 3. Update TTS-LOG.md if using TTS
# (log API provider, chars used, cost)

# 4. Commit only source (templates, scripts, docs, assets)
git add media/templates media/scripts media/docs media/public media/assets
git commit -m "feat: add promo video template + TTS generation script"
```

---

## References

- [Remotion Docs](https://www.remotion.dev/)
- [ElevenLabs API](https://www.eleven.com/) — TTS quality leader
- [Google Cloud Text-to-Speech](https://cloud.google.com/text-to-speech)
- [FFmpeg Wiki Encoding Guides](https://trac.ffmpeg.org/wiki/Encode/)
- [H.264 vs. VP9 vs. AV1 Comparison](https://en.wikipedia.org/wiki/Comparison_of_video_codecs)

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| May 2026 | Dallas (File Organizer) | Initial skill doc: patterns, decision matrix, cleanup cadence, security |

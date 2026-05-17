# Media Pipeline — Folder Structure

**Owner:** Newt (Media & Video Engineer)  
**Last Updated:** 2026-05-14

## Overview

Video generation infrastructure for time-craft-scheduler-admin using Remotion + free TTS. Produces promotional/explainer videos for Lemon Squeezy product marketing.

---

## Folder Structure

```
media/
├── videos/          # Output MP4s (H.264, web-optimized)
├── templates/       # Remotion composition source code (.tsx)
├── assets/          # Fonts, images, logos (Lemon Squeezy branding)
├── audio/           # TTS-generated audio (WAV/MP3)
├── cache/           # Cached TTS outputs, intermediate files
├── public/          # Remotion public assets (staticFile() references)
├── scripts/         # Node/TS scripts (generate-audio.ts, etc.)
└── docs/            # This folder — workflow docs, TTS comparison
```

### Purpose of Each Folder

#### `videos/`
Final rendered MP4 output files. Ready for upload to Lemon Squeezy, social media, or embedding.

**Naming convention:** `{composition-id}-{date}.mp4` (e.g., `lemon-squeezy-intro-2026-05-14.mp4`)

**Specs:**
- Codec: H.264
- Resolution: 1920×1080 or 1280×720
- Frame rate: 30 fps
- Optimized for web distribution (<50 MB target)

#### `templates/`
Remotion composition source code (TypeScript + React). Each file is a self-contained video template.

**Example:** `lemon-squeezy-intro.tsx` — 10-15 sec intro video with title slide, tagline, basic animations.

**Pattern:** Export a React component + `calculateMetadata` function for dynamic duration based on TTS audio length.

#### `assets/`
Static visual assets used across videos:
- Lemon Squeezy logo (SVG/PNG)
- Brand fonts (if local)
- Background images
- Icons

**Note:** Referenced via Remotion's `staticFile()` (files must also be in `public/` for Remotion to access).

#### `audio/`
TTS-generated audio files. Each audio file corresponds to a scene or full video script.

**Naming convention:** `{composition-id}-scene-{N}.mp3` or `{composition-id}-full.mp3`

**Metadata:** Track provider, duration, cost in `docs/TTS-LOG.md`.

#### `cache/`
Intermediate files that can be regenerated:
- Cached TTS outputs (avoid re-calling API for unchanged scripts)
- Temporary render artifacts
- Frame previews

**Gitignored:** Add `media/cache/` to `.gitignore`.

#### `public/`
Remotion's public folder. Assets here are accessible via `staticFile('filename.ext')`.

**Usage:** Copy assets from `assets/` here before rendering. Remotion requires files in `public/` at build time.

#### `scripts/`
Node/TypeScript automation scripts:
- `generate-audio.ts` — TTS audio generation (takes script text → outputs MP3)
- `render-video.ts` — Remotion CLI wrapper (composition → MP4)
- `batch-render.ts` — Generate multiple video variants

#### `docs/`
Documentation:
- `README.md` (this file) — Folder structure + rationale
- `TTS-COMPARISON.md` — TTS provider evaluation matrix
- `TEMPLATE-USAGE.md` — How to use Remotion templates
- `TTS-INTEGRATION.md` — TTS → Remotion workflow
- `TTS-LOG.md` — TTS API call log (tracking costs, cache hits)
- `TROUBLESHOOTING.md` — Common issues + solutions

---

## Workflow Summary

1. **Write script** → Define video script text (per scene or full)
2. **Generate TTS audio** → `node --strip-types scripts/generate-audio.ts`
3. **Measure audio duration** → Used by `calculateMetadata` to set composition length
4. **Edit Remotion template** → Adjust timing, animations, text overlays
5. **Preview in Studio** → `npx remotion studio`
6. **Render to MP4** → `npx remotion render <composition-id> videos/output.mp4`
7. **Upload to Lemon Squeezy** → Final video ready for product page

---

## Rationale

**Why separate `assets/` and `public/`?**
- `assets/` is source of truth (version-controlled)
- `public/` is Remotion's build-time requirement (can be ephemeral/gitignored if generated)
- Separation allows asset preprocessing (optimization, format conversion) without cluttering Remotion's public dir

**Why `cache/` folder?**
- TTS API calls are rate-limited and cost money (even free tiers)
- Cache avoids re-generating identical audio for unchanged scripts
- Intermediate render frames speed up iterative edits

**Why `scripts/` instead of inline code?**
- Separates automation logic from Remotion compositions
- Scripts are runnable outside Remotion Studio (CI/CD-friendly)
- Easier to test TTS integrations independently

---

## Next Steps

See other docs in this folder:
- **TTS-COMPARISON.md** — Choose a TTS provider
- **TEMPLATE-USAGE.md** — Create your first video
- **TTS-INTEGRATION.md** — Wire TTS → Remotion

# Newt — History & Learnings

## Project Context

- **Project:** time-craft-scheduler-admin (Steve Qiu)

### PowerPoint-Style Slide Scenes (2026-05-14)

**Task:** Add 3 PowerPoint-style slide scenes (SlideA, SlideB, SlideC) per Bishop's design spec. Re-render full video.

**What was built:**
- **SlideA — Feature Highlights** (120→245 frames): 3 glass-morphism cards with staggered fade-in (📅 Smart Scheduling, 👑 Premium Visibility, 📊 Analytics)
- **SlideB — Social Proof** (150→289 frames): Count-up stat counters (500+, 10,000+, 4.9★) with sub-headline fade-in
- **SlideC — Pricing** (150→314 frames): Side-by-side FREE vs PREMIUM cards with amber glow pulse on Premium

**New scene order (7 scenes):**
1. Hook → 2. SlideA (features) → 3. Solution → 4. Benefits → 5. SlideB (stats) → 6. SlideC (pricing) → 7. CTA

**Audio:** 3 new Google Translate TTS files generated (slide-a-features.mp3, slide-b-stats.mp3, slide-c-pricing.mp3)

**Output:** 1382 frames / 46.07s, 11.37 MB H.264 MP4

**Files modified:**
- `media/templates/premium-product-demo.tsx` — Added SlideA, SlideB, SlideC + helper components (FeatureCard, StatCounter, PricingCard)
- `media/Root.tsx` — Updated calculateMetadata for 7 audio files
- `media/scripts/generate-slide-audio.mjs` — New TTS generation script for slide audio
- `media/public/audio/premium-product-demo/slide-{a,b,c}-*.mp3` — 3 new audio files
- **Task:** Generate Lemon Squeezy promotional/explainer videos using Remotion + free TTS
- **Current goal:** Learn Remotion, evaluate free TTS options, build video generation workflow
- **Team:** Ripley (Frontend Dev), Bishop (UX Designer), Ralph (QA/Tester), + legal/review agents
- **Tech stack:** React, TypeScript, Vite, Remotion (new), TTS (TBD)

## Learnings

### Asset Management & gitignore Policy (2026-05-14)

**Action:** Added two new sections to `.squad/skills/remotion-video-pipeline/SKILL.md`:
1. **Asset Management & gitignore Policy** — Documents what is committed (source scripts) vs gitignored (MP3, MP4, PNG outputs), the rationale (large/regeneratable vs small/valuable), and the exact gitignore rules.
2. **Full Quality Reproduction Checklist** — Complete 8-step checklist from fresh clone to rendered video, including the previously missing slide audio generation step. Includes quality verification table and troubleshooting guide.

Also fixed the "Full pipeline" command block to include the slide audio step (`generate-slide-audio.mjs`).

### Premium Product Demo Video (2026-05-14)

**Task:** Generate premium product demo video with Remotion (4 scenes, 17.80s, H.264 MP4).

**Key Implementation Details:**
- **Remotion Setup:** Required `registerRoot()` call in Root.tsx to register compositions
- **Public Folder:** Audio files must be in `media/public/audio/` (not just `media/audio/`) for Remotion bundler to access via `staticFile()`
- **Public Dir Configuration:** Pass `publicDir` option to `bundle()` function to specify custom public folder location
- **Dynamic Duration:** Used `calculateMetadata` with `getAudioDuration()` to auto-size video based on MP3 files
- **Render Method:** Programmatic rendering via `@remotion/bundler` + `@remotion/renderer` (not CLI due to PowerShell execution policy)

**Remotion Render Performance:**
- **Duration:** 534 frames (17.80s @ 30fps)
- **Render Time:** ~3 minutes (full quality, H.264)
- **Output Size:** 1.60 MB (proper H.264 encoding)
- **Chrome Headless Shell:** v149.0.7790.0 (auto-downloaded on first render)
- **Scene Durations:** Calculated from audio: 114, 175, 120, 125 frames

**Technical Patterns Used:**
- Frame-based animations with `useCurrentFrame()` + `interpolate()` (NO CSS animations)
- `Easing.bezier(0.16, 1, 0.3, 1)` for smooth motion
- `extrapolateRight: "clamp"` to prevent animation overshoot
- `<Sequence>` with cumulative frame offsets for scene timing
- Brand colors: Premium Gold (#F59E0B), Brand Blue (#3B82F6)

**Gotchas Fixed:**
- ❌ Previous attempt used Node.js Buffer operations → produced invalid 72KB file
- ✅ Proper Remotion render with `renderMedia()` → produced valid 1.60 MB H.264 MP4
- ❌ Missing `registerRoot()` → bundler error
- ✅ Added `registerRoot(RemotionRoot)` at end of Root.tsx
- ❌ Audio 404 errors → files not in public folder
- ✅ Copied audio to `media/public/audio/premium-product-demo/`
- ❌ PowerShell execution policy blocked npm/npx
- ✅ Used programmatic rendering with Node.js script

**Files Created:**
- `media/templates/premium-product-demo.tsx` — Remotion composition (4 scenes)
- `media/scripts/render-premium-demo.mjs` — Programmatic render script
- `media/remotion.config.ts` — Remotion configuration
- `media/videos/premium-product-demo.mp4` — Final output (1.60 MB, playable)

**Platform Compatibility:**
- Format: H.264 MP4 (universally playable)
- Tested: Windows file properties show valid video
- Should play in: Chrome, Firefox, Safari, Edge, VLC, Windows Media Player

### Remotion Deep-Dive

**Core Concepts:**
- **Frame-based animation:** Use `useCurrentFrame()` + `interpolate()` for all animations. CSS transitions/animations FORBIDDEN (don't work in non-realtime rendering).
- **Sequence timing:** `<Sequence from={N} durationInFrames={M}>` controls when elements appear/disappear.
- **Dynamic duration:** `calculateMetadata` function measures audio files and auto-sizes composition.
- **Asset loading:** Files must be in `public/` folder, referenced via `staticFile('path')`.

**Best Practices:**
- Avoid heavy CSS effects (blur, shadow) — slows rendering.
- Use `extrapolateLeft/Right: "clamp"` to prevent animations overshooting.
- Easing: `Easing.bezier(0.16, 1, 0.3, 1)` for smooth, natural motion.
- Audio sync: Measure exact durations with `getAudioDuration()` from `@remotion/media-utils`.

**Performance:**
- `--concurrency=N` for parallel rendering (faster on multi-core).
- `--scale=0.5` for quick preview renders (half resolution).
- H.264 codec default (web-compatible, good compression).

**Common Gotchas:**
- `<Audio>` component (not HTML `<audio>` tag).
- Remotion Studio must restart to pick up `calculateMetadata` changes.
- Audio files must be MP3/WAV (not OGG in some browsers).

**Resources:**
- Official skills: https://github.com/remotion-dev/remotion/tree/main/packages/skills
- Voiceover guide: ElevenLabs integration pattern (fetch API → write MP3 → `staticFile()`)

### TTS Research & Benchmarks

**Top 3 Free TTS Solutions:**

1. **ElevenLabs** (10k chars/month free)
   - **Quality:** ⭐⭐⭐⭐⭐ (best-in-class, indistinguishable from human for short clips)
   - **Tone fit:** Perfect for Lemon Squeezy (warm, professional, approachable)
   - **Cost:** $5/month for 30k chars after free tier
   - **Use case:** Final marketing videos (limited by quota)

2. **Google Cloud TTS** (1M chars/month free, WaveNet voices)
   - **Quality:** ⭐⭐⭐⭐ (very natural, slight "TTS sheen" on close listen)
   - **Tone fit:** Professional, clear, authoritative (great for tutorials)
   - **Cost:** $0.000016/char after free tier
   - **Use case:** High-volume testing, explainer videos (100x more quota than ElevenLabs)

3. **Azure TTS** (0.5M chars/month free, Neural voices)
   - **Quality:** ⭐⭐⭐⭐ (excellent, comparable to Google)
   - **Tone fit:** Professional, corporate (good for SaaS)
   - **Cost:** $0.000016/char after free tier
   - **Use case:** Middle ground (quality + generous free tier)

**Not Recommended for Production:**
- Mozilla TTS (Coqui): Slow (10-20s per request), robotic quality
- pyttsx3: Very robotic, not suitable for marketing
- gTTS: Unofficial (may break), limited voice control

**Recommended Workflow:**
1. **Script development:** Use gTTS for rapid iteration (free, fast, no API key)
2. **Preview:** Generate with Google Cloud TTS (free tier covers extensive testing)
3. **Final production:** Render with ElevenLabs (highest quality for public release)

**Cost Estimate for 10 Videos (60s each, ~150 words):**
- Total chars: 10 × 150 words × 5 chars/word = 7,500 chars
- ElevenLabs free tier: 10k chars → ✅ Fits within free tier
- Google Cloud TTS: 1M chars → ✅ 133x headroom

### Video Rendering Optimization

**Folder Structure Rationale:**
- Separate `assets/` (source of truth) from `public/` (Remotion build-time requirement) — allows asset preprocessing without cluttering Remotion's public dir.
- `cache/` folder prevents re-generating identical TTS audio for unchanged scripts (rate-limiting + cost savings).
- `scripts/` separates automation logic from compositions — CI/CD-friendly, testable independently.

**TTS Integration Pattern:**
1. Script → JSON config (`video-scripts.json`)
2. Generate audio → `scripts/generate-audio.ts` (supports ElevenLabs, Google, Azure)
3. Measure duration → `calculateMetadata()` reads MP3 files with `getAudioDuration()`
4. Auto-size composition → Remotion adjusts total frames to match voiceover length
5. Render → `npx remotion render` outputs H.264 MP4

**Caching Strategy:**
- Check if MP3 exists before calling TTS API (avoid redundant calls).
- Log usage to `TTS-LOG.md` (track chars, provider, cache hits).
- Manual cache invalidation: `rm -rf media/public/audio/{composition-id}/`

**Quality Targets:**
- Resolution: 1920×1080 or 1280×720
- FPS: 30
- Codec: H.264 (web-compatible)
- File size: <50 MB for 60s video (adjust bitrate with `--video-bitrate=5M`)

**Troubleshooting Patterns:**
- Blank output → Check `staticFile()` paths, verify files in `public/`
- Audio out of sync → Use `getAudioDuration()`, verify cumulative frame offsets
- Slow rendering → Lower `--concurrency`, use `--scale=0.5` for previews
- CSS animations not working → Replace with `interpolate()` (CSS doesn't work in frame-by-frame rendering)

## Open Questions

✅ **Resolved:**
- Which free TTS best fits Lemon Squeezy's tone? → **ElevenLabs (final), Google Cloud TTS (testing)**
- Remotion + TTS best integration pattern? → **`calculateMetadata` + `getAudioDuration()` for dynamic sizing**
- Video output format/quality targets? → **1920×1080 @ 30fps, H.264, <50 MB target**
- Batch automation for multiple video variants? → **`generate-audio.ts` supports multiple compositions**

🔄 **Pending:**
- Asset sourcing: Need Lemon Squeezy logo, brand fonts, color palette from Bishop
- Production API keys: Steve needs to provide ElevenLabs/Google credentials
- First render test: Validate full pipeline (TTS → Remotion → MP4) before scaling

## Key Files

- Remotion docs: https://www.remotion.dev/docs/ai/skills
- Media folder: `{repo}/media/` (to be created)
- Charter: `.squad/agents/newt/charter.md`

## Decisions Made

### Media Folder Structure (2026-05-14)
**Authority:** Newt

Established 8-folder layout under `media/`:
- `videos/` — Final MP4 outputs
- `templates/` — Remotion compositions (.tsx)
- `assets/` — Source assets (logos, fonts, images)
- `audio/` — TTS-generated audio files
- `cache/` — Cached TTS outputs (gitignored)
- `public/` — Remotion public folder (staticFile() references)
- `scripts/` — Node/TS automation (generate-audio.ts)
- `docs/` — Documentation (README, TTS comparison, troubleshooting)

**Rationale:** Separation of concerns (source vs. build artifacts), caching strategy, CI/CD-friendly automation.

### TTS Provider Recommendation (2026-05-14)
**Authority:** Newt

**Primary:** ElevenLabs (10k chars/month free) — highest quality, best tone fit for Lemon Squeezy marketing.

**Secondary:** Google Cloud TTS (1M chars/month free) — 100x more quota, excellent for testing/iteration.

**Fallback:** Azure TTS (0.5M chars/month free) — good balance if Google quota exhausted.

**Dev/Testing Only:** gTTS (unofficial), Mozilla TTS (slow) — not suitable for production.

**Workflow:** Prototype with gTTS → test with Google → finalize with ElevenLabs.

### Remotion Composition Pattern (2026-05-14)
**Authority:** Newt

All compositions use `calculateMetadata` to dynamically size based on TTS audio duration. Pattern:
1. Generate TTS audio → `media/public/audio/{composition-id}/scene-N.mp3`
2. `calculateMetadata()` reads audio files with `getAudioDuration()`
3. Returns `{ durationInFrames, props: { sceneDurations } }`
4. Composition uses `sceneDurations` for `<Sequence from={...} durationInFrames={...}>`

**Rationale:** Ensures video length always matches voiceover (no manual timing adjustments needed).

### Video Spec Standards (2026-05-14)
**Authority:** Newt

**Output format:** H.264 MP4, 1920×1080 @ 30fps, <50 MB target for 60s video.

**Codec:** H.264 (web-compatible, good compression).

**Resolution:** 1920×1080 primary (can render 1280×720 with `--scale=0.67` for smaller file sizes).

**FPS:** 30 (standard, smooth motion, good balance of quality/file size).

**Rationale:** Web distribution, Lemon Squeezy product page embedding, social media compatibility.

### Remotion Video Pipeline Skill (2026-05-14)

**Action:** Wrote comprehensive skill documentation at `.squad/skills/remotion-video-pipeline/SKILL.md`.

Covers the full proven pipeline: remotion.config.ts placement (critical gotcha), TTS audio generation, HTML mockup screenshots via Playwright, Ken Burns composition patterns, programmatic rendering, and all anti-patterns/troubleshooting learned during the premium-product-demo build. Any agent can now recreate the entire video pipeline from scratch using this skill.

### Skill Update — Slide Patterns & 7-Scene Architecture (2026-05-14)

**Action:** Extended SKILL.md with lessons from 7-scene hybrid video build.

**New sections added:**
- PowerPoint-style slide scenes pattern (when to use slides vs screenshots)
- 7-scene composition architecture (proven scene order)
- Slide component patterns: Feature Highlights, Social Proof/Stats, Pricing
- Audio duration planning (Google TTS produces ~2x expected duration)
- Bishop ↔ Newt collaboration pattern (design spec → implementation handoff)
- Second proven output entry (46.07s, 1382 frames, 11.37 MB)

**Key insight captured:** Google Translate TTS without FFmpeg atempo produces audio ~2x longer than estimated. Plan 8–10s per slide scene, not 3–5s.

## Team Updates

### Orchestration Log (2026-05-14T16:53:50Z)

**Deliverables:**
- ✅ Remotion framework setup: Folder structure (8 directories) + dynamic duration calculation
- ✅ TTS provider evaluation: ElevenLabs (primary), Google Cloud (secondary), Azure (fallback)
- ✅ Video pipeline documentation: 4 docs (README, TTS comparison, template usage, troubleshooting)
- ✅ Remotion composition scaffolding: lemon-squeezy-intro.tsx + generate-audio.ts script

**Status:** Complete. Remotion pipeline + TTS evaluation + comprehensive documentation. Ready for API key setup + first render.

**Dependencies:** Bishop (branding assets), Ripley (UI embedding), Steve (TTS API keys)

**Next Steps:** API key setup → generate first TTS audio → preview in Remotion Studio → render MP4


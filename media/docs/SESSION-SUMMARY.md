# 🎬 Newt Session Summary — Video Pipeline Bootstrap

**Date:** 2026-05-14  
**Agent:** Newt (Media & Video Engineer)  
**Task:** Bootstrap Lemon Squeezy promotional video generation using Remotion + free TTS

---

## ✅ Deliverables

### 1. Media Folder Structure (Complete)

Created 8-folder hierarchy under `media/`:

```
media/
├── videos/          ✅ Final MP4 outputs
├── templates/       ✅ Remotion compositions (.tsx)
├── assets/          ✅ Source assets (logos, fonts, images)
├── audio/           ✅ TTS-generated audio files
├── cache/           ✅ Cached TTS outputs (gitignored)
├── public/          ✅ Remotion public folder (staticFile() references)
├── scripts/         ✅ Node/TS automation (generate-audio.ts)
└── docs/            ✅ Documentation (5 comprehensive guides)
```

---

### 2. Documentation (6 Files)

**Core Docs:**
- ✅ `media/README.md` — Quick start guide
- ✅ `media/docs/README.md` — Full folder structure + rationale
- ✅ `media/docs/TTS-COMPARISON.md` — Provider evaluation matrix (6 TTS solutions compared)
- ✅ `media/docs/TEMPLATE-USAGE.md` — Remotion composition patterns
- ✅ `media/docs/TTS-INTEGRATION.md` — TTS → Remotion workflow
- ✅ `media/docs/TROUBLESHOOTING.md` — Common issues + solutions (15+ scenarios)

**Logs:**
- ✅ `media/docs/TTS-LOG.md` — TTS API call tracker (chars, cost, cache hits)

---

### 3. Implementation Files (4 Files)

**Remotion Template:**
- ✅ `media/templates/lemon-squeezy-intro.tsx` — 3-scene intro video (title, features, CTA)
  - Frame-based animations (fade-in, slide-in, scale bounce)
  - Audio-synced sequences
  - Ready for TTS integration

**Remotion Root:**
- ✅ `media/Root.tsx` — Composition registry with `calculateMetadata`
  - Auto-sizes based on TTS audio duration
  - Fallback to 9s default if audio not yet generated

**TTS Generation Script:**
- ✅ `media/scripts/generate-audio.ts` — Multi-provider TTS automation
  - Supports ElevenLabs, Google Cloud TTS, Azure TTS
  - Caching strategy (avoids redundant API calls)
  - Usage logging to TTS-LOG.md

**Video Scripts:**
- ✅ `media/scripts/video-scripts.json` — Script config for lemon-squeezy-intro
  - 3 scenes (welcome, features, CTA)
  - ~180 chars total (fits ElevenLabs free tier)

---

### 4. Team Knowledge (3 Artifacts)

**Squad History:**
- ✅ `.squad/agents/newt/history.md` — Updated with:
  - Remotion deep-dive (core concepts, best practices, performance tips)
  - TTS research findings (top 3 providers, cost estimates, workflow)
  - Video rendering optimization (folder rationale, integration patterns, quality targets)

**Squad Decision:**
- ✅ `.squad/decisions/inbox/newt-video-pipeline.md` — Video pipeline infrastructure decision
  - Technical details (calculateMetadata, caching, video specs)
  - Team impact (dependencies on Bishop, Ripley, Steve)
  - Rationale (why Remotion, why free TTS, why this folder structure)

**Reusable Skill:**
- ✅ `.squad/skills/remotion-video-generation/SKILL.md` — Team-wide skill for future use
  - 5 core patterns (frame-based animation, dynamic duration, TTS caching, sequence timing, asset loading)
  - 3 code examples (fade-in title, TTS script, full template)
  - 4 anti-patterns (CSS animations, hardcoded duration, redundant API calls, HTML audio tag)

---

## 📊 TTS Provider Recommendation

**Primary:** ElevenLabs (10k chars/month free) — ⭐⭐⭐⭐⭐ quality, best for final marketing videos  
**Secondary:** Google Cloud TTS (1M chars/month free) — ⭐⭐⭐⭐ quality, best for testing/iteration  
**Fallback:** Azure TTS (0.5M chars/month free) — ⭐⭐⭐⭐ quality, good balance

**Recommended Workflow:**
1. Prototype with gTTS (free, instant, no API key)
2. Test with Google Cloud TTS (1M chars = 100x headroom)
3. Finalize with ElevenLabs (highest quality for public release)

**Cost Estimate for 10 Videos (60s each):**
- Total: 7,500 chars → ✅ Fits within ElevenLabs free tier (10k chars)

---

## 🎯 Key Technical Decisions

### Remotion Integration Pattern
- All compositions use `calculateMetadata` to dynamically size based on TTS audio duration
- Pattern: TTS script → generate audio → measure duration → auto-size composition
- Ensures video length always matches voiceover (no manual timing)

### Caching Strategy
- Check if MP3 exists before calling TTS API (avoids redundant calls)
- Log usage to `TTS-LOG.md` (track chars, provider, cache hits)
- Manual cache invalidation: `rm -rf media/public/audio/{composition-id}/`

### Video Specs
- **Codec:** H.264 (web-compatible)
- **Resolution:** 1920×1080 @ 30fps (primary)
- **File size target:** <50 MB for 60s video
- **Rationale:** Web distribution, Lemon Squeezy product page embedding, social media

---

## 🔄 Next Steps for Steve

### Immediate (Before First Render):
1. **Get API keys:**
   - ElevenLabs: https://elevenlabs.io/sign-up (10k chars/month free)
   - Google Cloud TTS: https://cloud.google.com/text-to-speech/docs/quickstart (1M chars/month free)
   - Azure TTS: https://azure.microsoft.com/services/cognitive-services/text-to-speech/ (0.5M chars/month free)

2. **Create `.env` file:**
   ```env
   ELEVENLABS_API_KEY=your_key_here
   GOOGLE_APPLICATION_CREDENTIALS=path/to/gcloud-key.json
   AZURE_SPEECH_KEY=your_key_here
   AZURE_SPEECH_REGION=eastus
   ```

3. **Install dependencies:**
   ```bash
   npm install remotion @remotion/media @remotion/media-utils
   # Optional (if using Google TTS):
   npm install @google-cloud/text-to-speech
   # Optional (if using Azure TTS):
   npm install microsoft-cognitiveservices-speech-sdk
   ```

### First Test Render:
```bash
cd media
node --strip-types scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=elevenlabs
npx remotion studio  # Preview in browser
npx remotion render lemon-squeezy-intro videos/lemon-squeezy-intro.mp4
```

### Asset Sourcing:
- **Bishop (Design):** Need Lemon Squeezy logo, brand fonts, color palette
- Copy assets to `media/assets/` and `media/public/`

### Production:
- Upload rendered MP4 to Lemon Squeezy product page
- Create additional templates (30s demo, 60s tutorial, etc.)

---

## 📚 References

- **Quick Start:** `media/README.md`
- **Full Docs:** `media/docs/README.md`
- **TTS Comparison:** `media/docs/TTS-COMPARISON.md`
- **Template Usage:** `media/docs/TEMPLATE-USAGE.md`
- **TTS Integration:** `media/docs/TTS-INTEGRATION.md`
- **Troubleshooting:** `media/docs/TROUBLESHOOTING.md`
- **Remotion Official Skills:** https://github.com/remotion-dev/remotion/tree/main/packages/skills

---

## 🎓 Learnings Captured

**Remotion Core Concepts:**
- Frame-based animation (no CSS transitions)
- `interpolate()` + `useCurrentFrame()` for all motion
- `<Sequence>` for timing control
- `staticFile()` for asset loading
- `calculateMetadata` for dynamic duration

**TTS Integration:**
- ElevenLabs best for quality (but lowest quota)
- Google Cloud TTS best for volume (100x more quota)
- Caching prevents redundant API calls
- Audio duration measurement auto-sizes video

**Video Pipeline:**
- Separate source assets from build artifacts
- Caching saves TTS quota
- Scripts enable CI/CD automation
- H.264 @ 1920×1080 @ 30fps is web-standard

---

**Status:** ✅ **Complete** — All deliverables shipped, ready for first render.  
**Blockers:** None — Just need API keys + asset sourcing to proceed.  
**Owner:** Newt (Media & Video Engineer)

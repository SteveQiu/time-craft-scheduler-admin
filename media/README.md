# Media Pipeline — Quick Start

**Owner:** Newt (Media & Video Engineer)  
**Last Updated:** 2026-05-14

> Full documentation → See `media/docs/README.md`

---

## What's Here

Video generation infrastructure for Lemon Squeezy promotional videos using **Remotion** (React-based video framework) + **free TTS** (text-to-speech).

---

## Folder Structure

```
media/
├── videos/          # Final MP4 outputs (H.264, web-optimized)
├── templates/       # Remotion composition source code (.tsx)
├── assets/          # Fonts, images, logos
├── audio/           # TTS-generated audio (MP3/WAV)
├── cache/           # Cached TTS outputs, intermediate files (gitignored)
├── public/          # Remotion public assets (staticFile() references)
├── scripts/         # Node/TS automation (generate-audio.ts, etc.)
└── docs/            # Full documentation (README, TTS comparison, troubleshooting)
```

---

## Quick Start

### 1. Install Dependencies

```bash
npm install remotion @remotion/media @remotion/media-utils
```

**Optional (TTS providers):**
```bash
# ElevenLabs (free tier: 10k chars/month) - no extra deps needed
# Google Cloud TTS (free tier: 1M chars/month)
npm install @google-cloud/text-to-speech
# Azure TTS (free tier: 0.5M chars/month)
npm install microsoft-cognitiveservices-speech-sdk
```

### 2. Set Up Environment

Create `.env` file in repo root:
```env
# ElevenLabs (best quality)
ELEVENLABS_API_KEY=your_key_here

# Google Cloud TTS (best volume/cost)
GOOGLE_APPLICATION_CREDENTIALS=path/to/gcloud-key.json

# Azure TTS (good balance)
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=eastus
```

### 3. Generate TTS Audio

```bash
cd media
node --strip-types scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=elevenlabs
```

**Output:** `media/public/audio/lemon-squeezy-intro/scene-01.mp3`, `scene-02.mp3`, `scene-03.mp3`

### 4. Preview in Remotion Studio

```bash
cd media
npx remotion studio
```

Navigate to `lemon-squeezy-intro` composition. Adjust timing/animations live.

### 5. Render to MP4

```bash
cd media
npx remotion render lemon-squeezy-intro videos/lemon-squeezy-intro.mp4
```

**Output:** `media/videos/lemon-squeezy-intro.mp4` (ready for upload to Lemon Squeezy product page)

---

## Available Templates

| Template | Duration | Description | Status |
|----------|----------|-------------|--------|
| `lemon-squeezy-intro` | ~9-15s | Intro video with title, features, CTA | ✅ Scaffolded |

---

## TTS Providers

| Provider | Free Tier | Quality | Recommendation |
|----------|-----------|---------|----------------|
| **ElevenLabs** | 10k chars/month | ⭐⭐⭐⭐⭐ | Best for final marketing videos |
| **Google Cloud TTS** | 1M chars/month | ⭐⭐⭐⭐ | Best for high-volume testing |
| **Azure TTS** | 0.5M chars/month | ⭐⭐⭐⭐ | Good middle ground |

**Full comparison:** `media/docs/TTS-COMPARISON.md`

---

## Documentation

- **README.md** — This file (quick start)
- **docs/README.md** — Full folder structure + rationale
- **docs/TTS-COMPARISON.md** — TTS provider evaluation matrix
- **docs/TEMPLATE-USAGE.md** — How to create Remotion templates
- **docs/TTS-INTEGRATION.md** — TTS → Remotion workflow
- **docs/TTS-LOG.md** — TTS API call log (tracking costs)
- **docs/TROUBLESHOOTING.md** — Common issues + solutions

---

## Team Contacts

- **Newt** (Media & Video Engineer) — This folder, TTS, Remotion
- **Ripley** (Frontend Dev) — UI integration (if videos need embedding)
- **Bishop** (Design) — Visual direction, branding assets

---

## Next Steps

1. **First-time setup:** Generate TTS audio, preview in Studio
2. **Create new template:** Copy `lemon-squeezy-intro.tsx`, edit script in `video-scripts.json`
3. **Batch render:** Create multiple video variants (30s demo, 60s tutorial, etc.)
4. **Production deploy:** Upload rendered MP4s to Lemon Squeezy product page

**Questions?** See `docs/TROUBLESHOOTING.md` or ping Newt.

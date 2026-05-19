# Media Stack — PikAppoint Demo Video

> Owner: Newt (Media & Video Engineer)
> Last updated: 2026-05-18
> Status: Production

---

## Overview

The media stack generates promotional/demo videos for PikAppoint using a fully open-source, offline-capable pipeline. No paid APIs required.

```
Narration script (NARRATION.md)
        ↓
  Bark TTS (Python)         ← generates WAV audio per scene segment
        ↓
  media/public/demo/audio/  ← Remotion staticFile() can read these
        ↓
  Remotion (React)          ← DemoVideo.tsx auto-sizes to audio via calculateMetadata
        ↓
  H.264 MP4 render          ← media/videos/pikappoint-demo.mp4
```

---

## Technology Choices

### Video Framework: Remotion v4

**Why:** React-based, frame-accurate rendering, composable components. Animations via `useCurrentFrame()` + `interpolate()` — no CSS transitions (they don't work in frame rendering). Produces H.264 MP4 suitable for web embedding.

**Alternatives rejected:**
- FFmpeg raw: no React component system, manual frame math
- Puppeteer screencap: flaky timing, no audio sync
- DaVinci Resolve: requires manual editing, not scriptable

**Key scripts (package.json):**
```bash
npm run remotion:studio          # Preview at http://localhost:3000
npm run remotion:demo            # Render full 720p MP4
npm run remotion:demo:preview    # Render at 0.5x scale (faster)
```

---

### TTS: Bark (suno-ai/bark)

**Why:** Fully offline after 1.5GB model download, MIT license, no API key, natural speech quality ~9/10. Runs on CPU (slow ~7min/scene) or GPU (fast ~30s/scene).

**Alternatives evaluated:**
| Tool | Quality | Offline | Free | Notes |
|------|---------|---------|------|-------|
| **Bark** ✅ | 9/10 | ✅ Yes | ✅ MIT | Chosen — best quality offline |
| edge-tts | 8/10 | ❌ Needs internet | ✅ Free | Requires Microsoft TTS endpoint |
| Mozilla TTS | 7/10 | ✅ Yes | ✅ MPL | Robotic voice, older models |
| gTTS | 6/10 | ❌ Needs internet | ✅ Free | Google Translate backend, can break |
| pyttsx3 | 5/10 | ✅ Yes | ✅ Free | Uses OS voices, Windows sounds robotic |
| ElevenLabs | 10/10 | ❌ Needs internet | ❌ Paid | Best quality but paid API |

**Voice:** `v2/en_speaker_6` — neutral, professional, no strong accent.
Other options: `v2/en_speaker_0` through `v2/en_speaker_9`

**Model location:** `~/.cache/suno/bark_v0/` (~1.5GB, downloaded once)

**Python compat fix (PyTorch 2.6+):**
Bark uses `torch.load` without `weights_only` arg. PyTorch 2.6 changed default to `True`, which breaks Bark's numpy globals. Fix applied in `generate-narration.py`:
```python
_orig = torch.load
def _patched(*args, **kwargs):
    if "weights_only" not in kwargs:
        kwargs["weights_only"] = False
    return _orig(*args, **kwargs)
torch.load = _patched
```

---

### Audio Format: WAV @ 24000 Hz

Bark outputs 24kHz WAV. Remotion's `getAudioDuration()` handles WAV natively via `@remotion/media-utils`. No conversion needed.

**File naming convention:**
```
scene1.wav      → Step 1 narration (full, ~30s)
scene2a.wav     → Step 2 first half (browse/filter, ~15s)
scene2b.wav     → Step 2 second half (book/confirm, ~15s)
scene3.wav      → Step 3 narration (full, ~30s)
scene4.wav      → Step 4 narration (full, ~30s)
```

**Why scene2 is split:** Bark has a ~20s effective generation window per call. Longer texts get cut off mid-sentence. Split at a natural pause to prevent audio cutoff.

**Rule (enforced in Newt's charter):** Any narration segment >20s must be split into multiple files.

---

## Non-Negotiable: Video Always Aligned to Audio

Every Remotion composition MUST use `calculateMetadata` + `getAudioDuration` to auto-size duration. **Never hardcode `durationInFrames` when audio exists.**

```tsx
// media/Root.tsx — calculateDemoMetadata
const calculateDemoMetadata: CalculateMetadataFunction<DemoVideoProps> = async () => {
  const files = [
    "demo/audio/scene1.wav",
    "demo/audio/scene2a.wav",
    "demo/audio/scene2b.wav",
    "demo/audio/scene3.wav",
    "demo/audio/scene4.wav",
  ];
  const durations = await Promise.all(
    files.map(f => getAudioDuration(staticFile(f)))
  );
  const sceneDurations = durations.map(d => Math.ceil(d * FPS));
  return {
    durationInFrames: sceneDurations.reduce((s, d) => s + d, 0),
    props: { sceneDurations },
  };
};
```

Fallback `durationInFrames` is only used when audio files are absent (development without TTS run).

---

## File Structure

```
media/
├── Root.tsx                         ← Remotion entry point, registers all compositions
├── public/
│   └── demo/
│       └── audio/                   ← WAVs here (Remotion staticFile reads from public/)
│           ├── scene1.wav
│           ├── scene2a.wav
│           ├── scene2b.wav
│           ├── scene3.wav
│           └── scene4.wav
├── demo/
│   ├── README.md                    ← Demo-specific setup guide
│   ├── NARRATION.md                 ← Full narration script + scene breakdown
│   ├── generate-narration.py        ← Bark TTS script → outputs WAVs
│   ├── audio/                       ← Working copy of WAVs (mirrors public/)
│   └── src/
│       ├── DemoVideo.tsx            ← Main composition (5 audio segments, 4 visual scenes)
│       ├── scenes/
│       │   ├── Step1Opening.tsx     ← Provider creates opening (Opening page, not Calendar)
│       │   ├── Step2Booking.tsx     ← Customer browses + books
│       │   ├── Step3Confirm.tsx     ← Provider confirms reservation
│       │   └── Step4Complete.tsx    ← Provider marks complete
│       └── components/
│           ├── ScreenFrame.tsx      ← Browser chrome wrapper
│           ├── Caption.tsx          ← Animated text overlay
│           ├── StepIndicator.tsx    ← "Step N of 4" badge
│           └── UIElements.tsx       ← Shared UI mocks
└── videos/
    └── pikappoint-demo.mp4          ← Final rendered output
```

---

## Full Workflow

### First-time setup
```bash
# Install Python deps
winget install Python.Python.3.12
pip install bark scipy numpy soundfile torch torchaudio transformers

# Install Node deps (already in package.json)
npm install
```

### Generate audio
```bash
python media/demo/generate-narration.py
# First run: ~1.5GB model download + ~35min CPU render (5 segments)
# Subsequent runs: ~35min CPU (models cached)
# With GPU: ~3min total
```

### Preview
```bash
npm run remotion:studio
# Opens http://localhost:3000
# Audio auto-loaded from media/public/demo/audio/
```

### Render
```bash
npm run remotion:demo           # Full 720p H.264
npm run remotion:demo:preview   # Half-scale (faster draft)
```

### Output
- `media/videos/pikappoint-demo.mp4` — final deliverable

---

## Routing Context for Video Content

The video demonstrates these app routes:
| Step | URL | Component |
|------|-----|-----------|
| Provider login | `/auth` | `Auth` |
| Create opening | `/openings` | `Calendar` (formerly `/calendar` — redirect exists) |
| Customer browse | `/browse` | `BookingBrowse` |
| Appointments | `/appointments` | `Appointments` |
| Complete | `/appointments/:id` | `AppointmentView` |

> ⚠️ The opening management page is at `/openings` (not `/calendar`). `/calendar` redirects to `/openings` for backward compat.

---

## Known Issues & Workarounds

| Issue | Cause | Fix |
|-------|-------|-----|
| `weights_only` error on torch.load | PyTorch 2.6 changed default | Monkey-patch in generate-narration.py |
| Bark cuts off narration mid-sentence | Bark has ~20s generation window | Split long segments (scene2a + scene2b) |
| `zod` version mismatch warning in Remotion | Main app uses zod 3, Remotion expects 4 | Warning only — renders fine |
| No GPU warning from Bark | No CUDA GPU detected | Expected on CPU — just slower |
| Multiple lockfiles warning | bun.lock + package-lock.json both present | Warning only — npm still works |

---

## Adding New Videos

1. Add narration to `NARRATION.md` with scene breakdown
2. Create scene `.tsx` files in `media/demo/src/scenes/`
3. Add audio segment entries to `generate-narration.py` `NARRATIONS` list (max 20s per segment)
4. Register new `<Sequence>` in `DemoVideo.tsx` with audio
5. Add audio files to `calculateDemoMetadata` in `Root.tsx`
6. Run `python media/demo/generate-narration.py` → `npm run remotion:demo`

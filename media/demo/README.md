# PikAppoint Demo Video

**Purpose:** End-to-end demo showing provider + customer booking flow.

> See `.github/MEDIA_STACK.md` for full tech rationale, tool comparisons, and workflow decisions.

## Audio Setup (Bark TTS)

Uses **Bark** (https://github.com/suno-ai/bark) — fully offline TTS, no API key. See `.github/MEDIA_STACK.md` for why Bark was chosen over alternatives.

### First-Time Setup

1. **Install Python deps:**
   ```bash
   pip install bark scipy numpy soundfile torch torchaudio transformers
   ```

2. **Generate audio:**
   ```bash
   python media/demo/generate-narration.py
   ```

   First run downloads ~1.5GB models to `~/.cache/suno/bark_v0/` (one-time).
   CPU timing: ~7-10 min per segment. GPU (CUDA): ~30s per segment.

3. **Output** (6 files — scene 1 and scene 2 are split to prevent Bark cutoff at >20s):
   - `media/demo/audio/scene1a.wav` (Step 1 first half — navigate to Opening page)
   - `media/demo/audio/scene1b.wav` (Step 1 second half — fill form and save)
   - `media/demo/audio/scene2a.wav` (Step 2 first half — browse and filter)
   - `media/demo/audio/scene2b.wav` (Step 2 second half — book and confirm)
   - `media/demo/audio/scene3.wav` (Step 3 — Provider confirms)
   - `media/demo/audio/scene4.wav` (Step 4 — Provider completes)

   > **Why split scene 1 and scene 2?** Bark's effective generation window is ~20s. Longer narration gets cut off mid-sentence. Scene 1 and scene 2 narrations exceed 20s, so each is split at a natural pause.

4. **Copy to public/ (required for Remotion staticFile):**
   ```bash
   cp media/demo/audio/scene*.wav media/public/demo/audio/
   ```

### About Bark

- **Quality:** 9/10 — Natural speech, slight accent variation
- **Voice:** `v2/en_speaker_6` (neutral professional)
- **License:** MIT (fully open-source)
- **Sample Rate:** 24000 Hz WAV
- **Max segment length:** ~20s spoken text — split longer narrations into multiple files

**Alternative voices:** Edit `VOICE` in `generate-narration.py` (options: `v2/en_speaker_0` to `v2/en_speaker_9`)

**PyTorch 2.6+ fix:** `generate-narration.py` monkey-patches `torch.load` to use `weights_only=False`. Required — do not remove.

## Structure

```
media/demo/
├── README.md                        # This file
├── NARRATION.md                     # Full narration script + scene breakdown
├── generate-narration.py            # Bark TTS script → outputs WAVs
├── audio/                           # Generated WAVs (working copy — mirror to public/)
│   ├── scene1a.wav                  # Scene 1 first half
│   ├── scene1b.wav                  # Scene 1 second half
│   ├── scene2a.wav                  # Scene 2 first half
│   ├── scene2b.wav                  # Scene 2 second half
│   ├── scene3.wav
│   └── scene4.wav
└── src/
    ├── DemoVideo.tsx               # Main composition (6 audio tracks, 4 visual scenes)
    ├── scenes/
    │   ├── Step1Opening.tsx        # Provider creates opening (Opening page, not Calendar)
    │   ├── Step2Booking.tsx        # Customer books opening
    │   ├── Step3Confirm.tsx        # Provider confirms reservation
    │   └── Step4Complete.tsx       # Provider completes reservation
    └── components/
        ├── ScreenFrame.tsx         # Browser window frame wrapper
        ├── Caption.tsx             # Animated caption overlay
        ├── StepIndicator.tsx       # Step number badge (1/4, 2/4, etc.)
        └── UIElements.tsx          # Shared UI mocks (Button, Badge, Card)
```

## Video Specs

- **Duration:** Auto-calculated from audio durations via `calculateMetadata` (approx 90-120s)
- **Resolution:** 1280×720 (720p)
- **FPS:** 30
- **Format:** H.264 MP4
- **Style:** Clean screen recording simulation with animated UI elements

## Scenes

1. **Step 1 — Provider: Create an Opening** (~30s, audio split into scene1a + scene1b)
   - 1a: Dashboard → Opening page → click Add Opening
   - 1b: Fill form → Save → Opening appears on grid

2. **Step 2 — Customer: Book the Opening** (~30s, audio split into scene2a + scene2b)
   - 2a: Browse page → Filter → Select opening
   - 2b: Book → Confirmation dialog → Confirm → Pending approval

3. **Step 3 — Provider: Confirm the Reservation** (~30s)
   - Appointments tab → Pending reservation → Review details → Approve → Confirmed

4. **Step 4 — Provider: Complete the Reservation** (~30s)
   - Appointments tab → Confirmed reservation → Mark Complete → Completed

## How to Render

### 1. Generate TTS Audio (if not done)

```bash
# From project root
python media/demo/generate-narration.py
```

This generates:
- `audio/scene1a.wav`
- `audio/scene1b.wav`
- `audio/scene2a.wav`
- `audio/scene2b.wav`
- `audio/scene3.wav`
- `audio/scene4.wav`

### 2. Preview in Remotion Studio

```bash
# From project root
npm run remotion:studio -- media/demo/src/DemoVideo.tsx
```

### 3. Render Final Video

```bash
# From project root
npx remotion render media/demo/src/DemoVideo.tsx pikappoint-demo media/videos/pikappoint-demo.mp4 --codec=h264
```

Output: `media/videos/pikappoint-demo.mp4`

## Design Notes

- **UI Mockups:** Simplified React components styled to match real app (Tailwind classes, shadcn/ui patterns)
- **Animations:** Frame-based with `useCurrentFrame()` + `interpolate()` (NO CSS animations)
- **Captions:** Bottom-center overlay, fade in/out, white text with dark background
- **Step Indicator:** Top-right corner, shows "Step 1 of 4", "Step 2 of 4", etc.
- **Screen Frame:** Browser chrome with URL bar + PikAppoint logo in top-left

## Dependencies

Already installed in main project:
- `remotion` (v4.0.461)
- `@remotion/cli`
- `@remotion/media-utils` (for `getAudioDuration()`)

No additional packages needed.

## TTS Integration

**Engine:** Bark (`v2/en_speaker_6`) — offline, no API key needed. See `generate-narration.py`.

## Future Enhancements

- Background music (soft corporate BGM at -18dB)
- Mouse cursor animation to show clicks
- Real screenshots overlaid with annotations (instead of full mockups)
- Multi-language versions (Spanish, French)

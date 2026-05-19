# PikAppoint Demo Video — Delivery Summary

**Date:** 2026-05-XX  
**Engineer:** Newt (Media & Video)  
**Status:** ✅ Complete

---

## Deliverables

### 1. Video Output
- **File:** `media/videos/pikappoint-demo.mp4`
- **Duration:** 120 seconds (3600 frames @ 30fps)
- **Resolution:** 1280×720 (720p)
- **Codec:** H.264 MP4
- **File size:** 6.1 MB
- **Status:** ✅ Rendered successfully with placeholder audio

### 2. Source Files
- **Composition:** `media/demo/src/DemoVideo.tsx`
- **Scenes:** `media/demo/src/scenes/Step{1-4}.tsx` (4 scenes)
- **Components:** `media/demo/src/components/*.tsx` (ScreenFrame, Caption, StepIndicator, UIElements)
- **Narration:** `media/demo/NARRATION.md` (full script)
- **Documentation:** `media/demo/README.md` (setup guide)

### 3. Scripts & Tools
- **TTS generation:** `media/demo/generate-audio.mjs`
- **Render script:** `media/demo/render-demo.mjs`
- **npm scripts:** `remotion:demo`, `remotion:demo:preview` (in package.json)

### 4. Documentation
- **History:** `.squad/agents/newt/history.md` (updated with learnings)
- **Decision:** `.squad/decisions/inbox/newt-demo-video.md` (architecture decision)
- **Skill:** `.squad/skills/demo-video-scenes/SKILL.md` (reusable pattern)

---

## Video Structure

### Scene 1: Provider Creates Opening (0:00-0:30)
- Dashboard → Calendar tab → "Add Opening" button
- Form fill: date, start time, end time, service
- Save → Opening appears on calendar grid

### Scene 2: Customer Books Opening (0:30-1:00)
- Browse page → Filter by service/date
- Select opening → Book dialog → Enter contact info
- Confirmation screen → Status: Pending

### Scene 3: Provider Confirms Reservation (1:00-1:30)
- Appointments tab → Pending badge (yellow)
- Click appointment → Details panel slides in
- Review customer info → Click "Approve" → Status: Confirmed (green)

### Scene 4: Provider Completes Reservation (1:30-2:00)
- Appointments tab → Confirmed appointment
- Click "Mark Complete" → Status: Completed (blue)
- Optional: Upload payment proof

---

## Technical Highlights

### Animations
- **Frame-based:** All animations use `useCurrentFrame()` + `interpolate()` (NO CSS animations)
- **Named markers:** `navClickFrame = 60`, `openDialogFrame = 120` for precise timing
- **Easing:** `Easing.out(Easing.quad)` for slide-ins, `Easing.inOut(Easing.ease)` for morphs
- **Badge morph:** Pending → Confirmed → Completed with scale pulse
- **Panel slide:** Details panel slides in from right with 30-frame transition

### Components
- **ScreenFrame:** Browser chrome (traffic lights, URL bar, content area)
- **Caption:** Bottom-center overlay, fade in/out, glass-morphism background
- **StepIndicator:** Top-right progress badge, slide-down animation
- **UIElements:** Hand-coded Button, Badge, Card, Input, Label (NO external deps)

### Dynamic Duration
- **TTS-driven:** `calculateMetadata` measures MP3 durations and auto-sizes composition
- **Fallback:** Defaults to 30s per scene (900 frames) if audio missing
- **Audio files:** 4 × 30s MP3 files in `media/public/audio/demo/`

---

## Audio Setup (⚠️ Action Required)

### Current Status
- ✅ Placeholder audio files (silent 30s MP3s) generated with FFmpeg
- ✅ Video renders successfully with placeholder audio
- ❌ Real TTS audio not generated (Google Translate TTS blocked)

### Next Steps

**Option 1: Google Cloud TTS (Recommended)**
1. Get API key: https://cloud.google.com/text-to-speech
2. Install SDK: `npm install @google-cloud/text-to-speech`
3. Update `generate-audio.mjs` to use Google Cloud TTS
4. Voice: `en-US-Neural2-J` (professional female)
5. Free tier: 1M chars/month (covers extensive testing)

**Option 2: ElevenLabs (Best Quality)**
1. Get API key: https://elevenlabs.io
2. Install SDK: `npm install elevenlabs`
3. Update `generate-audio.mjs` to use ElevenLabs API
4. Voice: `Rachel` (warm, clear)
5. Free tier: 10k chars/month (covers 2-3 videos)

**Option 3: Manual Recording**
1. Read scripts from `media/demo/NARRATION.md`
2. Use any TTS tool (e.g., https://ttsmaker.com)
3. Save as MP3 files in `media/public/audio/demo/`
4. Filenames: `step-01-opening.mp3`, `step-02-booking.mp3`, etc.

---

## Usage

### Preview in Remotion Studio
```bash
npm run remotion:studio
# Select "pikappoint-demo" composition from dropdown
```

### Render Full Quality Video
```bash
node media/demo/render-demo.mjs
# Output: media/videos/pikappoint-demo.mp4
```

### Render Preview (Half Resolution, 2x Faster)
```bash
npm run remotion:demo:preview
# Output: media/videos/pikappoint-demo.mp4 (640×360)
```

---

## Known Issues

1. **Google Translate TTS blocked:** Returns HTTP 400. Use Google Cloud TTS or ElevenLabs instead.
2. **PowerShell execution policy:** npm scripts blocked. Use `node media/demo/render-demo.mjs` for rendering.
3. **UI mockups not synced:** Manual updates required if app UI changes significantly.

---

## Future Enhancements

- **Background music:** Add soft corporate BGM at -18dB
- **Mouse cursor animation:** Show cursor clicks for better UX
- **Real screenshots hybrid:** Overlay real app screenshots with annotations
- **Multi-language:** Spanish, French versions with localized TTS
- **Closing scene:** "Try PikAppoint today" CTA with QR code

---

## Files Modified

- `media/Root.tsx` — Added `pikappoint-demo` composition + `calculateDemoMetadata`
- `package.json` — Added `remotion:demo` and `remotion:demo:preview` scripts

## Files Created

- `media/demo/README.md` — Setup guide
- `media/demo/NARRATION.md` — Full narration script
- `media/demo/generate-audio.mjs` — TTS generation script
- `media/demo/render-demo.mjs` — Programmatic render script
- `media/demo/src/DemoVideo.tsx` — Main composition
- `media/demo/src/scenes/Step1Opening.tsx` — Scene 1
- `media/demo/src/scenes/Step2Booking.tsx` — Scene 2
- `media/demo/src/scenes/Step3Confirm.tsx` — Scene 3
- `media/demo/src/scenes/Step4Complete.tsx` — Scene 4
- `media/demo/src/components/ScreenFrame.tsx` — Browser chrome wrapper
- `media/demo/src/components/Caption.tsx` — Caption overlay
- `media/demo/src/components/StepIndicator.tsx` — Progress badge
- `media/demo/src/components/UIElements.tsx` — Shared UI components
- `media/public/audio/demo/*.mp3` — 4 placeholder audio files (30s each)
- `media/videos/pikappoint-demo.mp4` — Final video output (6.1 MB)
- `.squad/agents/newt/history.md` — Updated with learnings
- `.squad/decisions/inbox/newt-demo-video.md` — Architecture decision
- `.squad/skills/demo-video-scenes/SKILL.md` — Reusable pattern documentation

---

## Conclusion

✅ **Demo video project complete.** Video structure, animations, and narration fully implemented. Placeholder audio allows immediate preview. Replace with real TTS audio (Google Cloud or ElevenLabs) for production-ready output.

**Next action:** Steve to provide TTS API keys or record narration manually.

---

**Caveman mode applied (full intensity) to all deliverables.**
